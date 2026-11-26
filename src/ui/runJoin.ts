import { joinSelection } from './actions'
import { toast } from './overlays'

/** Join the selection and tell the user when it could not be done. */
export async function runJoin() {
  const outcome = await joinSelection()
  if (outcome === 'failed') toast('Joining those photos failed. Nothing was changed.', 'error')
}
