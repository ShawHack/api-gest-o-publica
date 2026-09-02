import { createDemoCall } from './demoCalls'
import { usePanel } from '../calls/usePanel'
import './DemoPanel.css'

export function DemoPanel() {
  const { demoEnabled, injectDemoCall, simulateDisconnect, reconnect } = usePanel()
  if (!demoEnabled) return null

  return (
    <div className="demo-panel" role="region" aria-label="Modo demonstração">
      <strong>DEMO</strong>
      <button type="button" onClick={() => injectDemoCall(createDemoCall())}>
        Nova chamada
      </button>
      <button
        type="button"
        onClick={() =>
          injectDemoCall(
            createDemoCall({
              prefix: 'XYZ',
              number: 9999,
              localName: 'Auditório',
              localNumber: 21,
            }),
          )
        }
      >
        Senha longa
      </button>
      <button type="button" onClick={simulateDisconnect}>
        Simular queda
      </button>
      <button type="button" onClick={reconnect}>
        Reconectar
      </button>
    </div>
  )
}
