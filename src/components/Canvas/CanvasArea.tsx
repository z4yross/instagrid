import type { ImageBlock } from "@/store/types";
import { useStore } from "@/store/useStore";
import { cellPixelSize, COLS, hasCollision } from "@/utils/gridUtils";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import Block from "../Block/Block";
import DropZone from "./DropZone";
import GridCanvas from "./GridCanvas";

interface Props {
	onLowRes?: (names: string[]) => void;
}

export default function CanvasArea({ onLowRes }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [dims, setDims] = useState({ w: 0, h: 0 });
	const [activeId, setActiveId] = useState<string | null>(null);
	const initialOffsetRef = useRef({ x: 0, y: 0 });

	const blocks = useStore((s) => s.blocks);
	const selectedBlockIds = useStore((s) => s.selectedBlockIds);
	const visibleRows = useStore((s) => s.visibleRows);
	const gridRows = useStore((s) => s.gridRows);
	const updateBlock = useStore((s) => s.updateBlock);
	const addBlock = useStore((s) => s.addBlock);
	const setSelectedBlocks = useStore((s) => s.setSelectedBlocks);
	const setVisibleRows = useStore((s) => s.setVisibleRows);
	const setGridCellSize = useStore((s) => s.setGridCellSize);

	const copiedBlocksRef = useRef<ImageBlock[]>([]);

	const isGroupDragging =
		activeId !== null &&
		selectedBlockIds.includes(activeId) &&
		selectedBlockIds.length > 1;

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) => {
			setDims({
				w: entry.contentRect.width,
				h: entry.contentRect.height,
			});
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	// T57: copy/paste blocks
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedBlockIds.length > 0) {
				e.preventDefault();
				copiedBlocksRef.current = blocks.filter((b) => selectedBlockIds.includes(b.id));
			} else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedBlocksRef.current.length > 0) {
				e.preventDefault();
				// Find first free cell
				let freeCol = 0;
				let freeRow = 0;
				outer: for (let r = 0; r < gridRows + 3; r++) {
					for (let c = 0; c < COLS; c++) {
						const occupied = blocks.some(
							(b) => c >= b.col && c < b.col + b.colSpan && r >= b.row && r < b.row + b.rowSpan
						);
						if (!occupied) {
							freeCol = c;
							freeRow = r;
							break outer;
						}
					}
				}

				// Paste blocks with offset
				const newIds: string[] = [];
				copiedBlocksRef.current.forEach((copied) => {
					const newBlock: ImageBlock = {
						...copied,
						id: crypto.randomUUID(),
						col: freeCol,
						row: freeRow,
					};
					addBlock(newBlock);
					newIds.push(newBlock.id);
				});
				setSelectedBlocks(newIds);
			}
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [blocks, selectedBlockIds, gridRows, addBlock, setSelectedBlocks]);

	const { w: cellW, h: cellH } = cellPixelSize(
		dims.w || 600,
		visibleRows,
		dims.h || 0
	);

	// T69: Update store with current grid cell size for export
	useEffect(() => {
		setGridCellSize(cellW, cellH);
	}, [cellW, cellH, setGridCellSize]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
	);

	const getCellSize = useCallback(
		() =>
			cellPixelSize(
				containerRef.current?.clientWidth ?? 600,
				visibleRows,
				containerRef.current?.clientHeight ?? 0
			),
		[visibleRows]
	);

	function snapToGrid(
		pixelX: number,
		pixelY: number
	): { col: number; row: number } {
		const { w: cW, h: cH } = getCellSize();
		const col = Math.max(0, Math.min(COLS - 1, Math.round(pixelX / cW)));
		const row = Math.max(0, Math.round(pixelY / cH));
		return { col, row };
	}

	function onDragStart(e: DragStartEvent) {
		setActiveId(e.active.id as string);

		if (
			e.activatorEvent &&
			"clientX" in e.activatorEvent &&
			e.active.rect.current.initial
		) {
			const rect = e.active.rect.current.initial;
			const event = e.activatorEvent as PointerEvent;
			initialOffsetRef.current = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			};
		}
	}

	function onDragEnd(e: DragEndEvent) {
		setActiveId(null);

		const { active, delta } = e;
		const draggedBlock = blocks.find((b) => b.id === active.id) as
			| ImageBlock
			| undefined;
		if (!draggedBlock) return;

		const { w: cW, h: cH } = getCellSize();

		// V12: if part of group, move all selected blocks
		const isGroupDrag =
			selectedBlockIds.includes(draggedBlock.id) &&
			selectedBlockIds.length > 1;

		if (isGroupDrag) {
			const deltaCol = Math.round(delta.x / cW);
			const deltaRow = Math.round(delta.y / cH);

			const selectedBlocks = blocks.filter((b) =>
				selectedBlockIds.includes(b.id)
			);

			// B7: prevent border collision merge by ensuring all blocks move uniformly
			// If any block would hit a border, clamp the entire group's delta
			let clampedDeltaCol = deltaCol;
			let clampedDeltaRow = deltaRow;

			for (const b of selectedBlocks) {
				const maxCol = COLS - b.colSpan;
				const proposedCol = b.col + deltaCol;
				if (proposedCol < 0)
					clampedDeltaCol = Math.max(clampedDeltaCol, -b.col);
				if (proposedCol > maxCol)
					clampedDeltaCol = Math.min(clampedDeltaCol, maxCol - b.col);

				const proposedRow = b.row + deltaRow;
				if (proposedRow < 0)
					clampedDeltaRow = Math.max(clampedDeltaRow, -b.row);
			}

			// check if all blocks can move with clamped delta
			const canMove = selectedBlocks.every((b) => {
				const newCol = b.col + clampedDeltaCol;
				const newRow = b.row + clampedDeltaRow;
				return !hasCollision(
					blocks.filter((bl) => !selectedBlockIds.includes(bl.id)),
					newCol,
					newRow,
					b.colSpan,
					b.rowSpan
				);
			});

			if (canMove) {
				selectedBlocks.forEach((b) => {
					updateBlock(b.id, {
						col: b.col + clampedDeltaCol,
						row: b.row + clampedDeltaRow,
					});
				});
			}
		} else {
			const newPixelX = draggedBlock.col * cW + delta.x;
			const newPixelY = draggedBlock.row * cH + delta.y;
			const { col, row } = snapToGrid(newPixelX, newPixelY);

			const clampedCol = Math.min(col, COLS - draggedBlock.colSpan);
			const clampedRow = Math.max(0, row);

			if (
				hasCollision(
					blocks,
					clampedCol,
					clampedRow,
					draggedBlock.colSpan,
					draggedBlock.rowSpan,
					draggedBlock.id
				)
			)
				return;

			updateBlock(draggedBlock.id, { col: clampedCol, row: clampedRow });
		}
	}

	return (
		<div
			ref={containerRef}
			style={{
				flex: 1,
				position: "relative",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
			}}
			onClick={() => setSelectedBlocks([])}
		>
			{/* V20: row-based zoom controls */}
			<div
				style={{
					position: "absolute",
					bottom: 16,
					left: 16,
					zIndex: 50,
					display: "flex",
					gap: 4,
					background: "var(--color-bg-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: 8,
					padding: 4,
					boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
				}}
			>
				<button
					onClick={(e) => {
						e.stopPropagation();
						setVisibleRows(visibleRows + 1);
					}}
					disabled={visibleRows >= 10}
					style={{
						padding: "6px 10px",
						fontSize: 12,
						background: "var(--color-bg-elevated)",
						border: "1px solid var(--color-border)",
						borderRadius: 6,
						cursor: visibleRows >= 10 ? "not-allowed" : "pointer",
						color: "var(--color-text-primary)",
						opacity: visibleRows >= 10 ? 0.5 : 1,
					}}
				>
					−
				</button>
				<span
					style={{
						padding: "6px 10px",
						fontSize: 11,
						color: "var(--color-text-secondary)",
						minWidth: 60,
						textAlign: "center",
					}}
				>
					{visibleRows} {visibleRows === 1 ? "row" : "rows"}
				</span>
				<button
					onClick={(e) => {
						e.stopPropagation();
						setVisibleRows(visibleRows - 1);
					}}
					disabled={visibleRows <= 1}
					style={{
						padding: "6px 10px",
						fontSize: 12,
						background: "var(--color-bg-elevated)",
						border: "1px solid var(--color-border)",
						borderRadius: 6,
						cursor: visibleRows <= 1 ? "not-allowed" : "pointer",
						color: "var(--color-text-primary)",
						opacity: visibleRows <= 1 ? 0.5 : 1,
					}}
				>
					+
				</button>
				<button
					onClick={(e) => {
						e.stopPropagation();
						setVisibleRows(3);
					}}
					style={{
						padding: "6px 10px",
						fontSize: 11,
						background: "var(--color-bg-elevated)",
						border: "1px solid var(--color-border)",
						borderRadius: 6,
						cursor: "pointer",
						color: "var(--color-text-secondary)",
					}}
				>
					Reset
				</button>
			</div>

			<DndContext
				sensors={sensors}
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
			>
				<DropZone onLowRes={onLowRes}>
					<GridCanvas cellW={cellW} cellH={cellH}>
						{blocks.map((block) => (
							<Block
								key={block.id}
								block={block}
								cellW={cellW}
								cellH={cellH}
								isDragging={
									isGroupDragging
										? selectedBlockIds.includes(block.id)
										: activeId === block.id
								}
							/>
						))}
					</GridCanvas>
				</DropZone>

				{/* V19: group drag overlay */}
				<DragOverlay style={{ pointerEvents: "none" }}>
					{activeId ? (
						<div style={{ pointerEvents: "none" }}>
							{selectedBlockIds.includes(activeId) &&
							selectedBlockIds.length > 1 ? (
								<div
									style={{
										position: "relative",
									}}
								>
									{blocks
										.filter((b) =>
											selectedBlockIds.includes(b.id)
										)
										.map((block) => {
											const activeBlock = blocks.find(
												(b) => b.id === activeId
											)!;

											const relativeCol =
												block.col - activeBlock.col;

											const relativeRow =
												block.row - activeBlock.row;

											return (
												<div
													key={block.id}
													style={{
														position: "absolute",
														left:
															relativeCol * cellW,
														top:
															relativeRow * cellH,
														width:
															block.colSpan *
															cellW,
														height:
															block.rowSpan *
															cellH,
													}}
												>
													<div
														style={{
															width: "100%",
															height: "100%",

															background: `
                          linear-gradient(
                            145deg,
                            rgba(255, 107, 53, 0.32),
                            rgba(200, 60, 20, 0.18)
                          ),
                          rgba(15, 15, 28, 0.92)
                        `,

															// border: "1px solid rgba(168, 85, 247, 0.45)",

															borderRadius: 0,

															opacity: 0.96,

															boxShadow: `
                          0 18px 40px rgba(0,0,0,0.45),
                          0 0 24px rgba(139,92,246,0.18),
                          inset 0 1px 0 rgba(255,255,255,0.06)
                        `,

															backdropFilter:
																"blur(10px)",

															position:
																"relative",
															overflow: "hidden",
														}}
													>
														<div
															style={{
																position:
																	"absolute",
																inset: 0,

																background: `
                            linear-gradient(
                              135deg,
                              rgba(255,255,255,0.08),
                              transparent 40%
                            )
                          `,

																borderRadius: 0,
															}}
														/>
													</div>
												</div>
											);
										})}
								</div>
							) : (
								<div
									style={{
										width:
											blocks.find(
												(b) => b.id === activeId
											)!.colSpan * cellW,

										height:
											blocks.find(
												(b) => b.id === activeId
											)!.rowSpan * cellH,

										background: `
                linear-gradient(
                  145deg,
                  rgba(255, 107, 53, 0.32),
                  rgba(200, 60, 20, 0.18)
                ),
                rgba(15, 15, 28, 0.92)
              `,

										// border: "1px solid rgba(168, 85, 247, 0.45)",

										borderRadius: 0,

										opacity: 0.96,

										boxShadow: `
                0 18px 40px rgba(0,0,0,0.45),
                0 0 24px rgba(139,92,246,0.18),
                inset 0 1px 0 rgba(255,255,255,0.06)
              `,

										backdropFilter: "blur(10px)",

										position: "relative",
										overflow: "hidden",
									}}
								>
									<div
										style={{
											position: "absolute",
											inset: 0,

											background: `
                  linear-gradient(
                    135deg,
                    rgba(255,255,255,0.08),
                    transparent 40%
                  )
                `,

											borderRadius: 0,
										}}
									/>
								</div>
							)}
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}
