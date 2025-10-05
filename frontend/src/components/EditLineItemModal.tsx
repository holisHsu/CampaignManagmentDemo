import { useState, useEffect } from 'react'
import Decimal from 'decimal.js'

interface LineItem {
  id: number
  name: string
  booked_amount: string
  actual_amount: string
  adjustment_amount: string
  final_amount: string
  created_at: string
  updated_at: string
}

interface EditLineItemModalProps {
  lineItem: LineItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (lineItemId: number, newAdjustmentAmount: string) => Promise<void>
}

function EditLineItemModal({ lineItem, isOpen, onClose, onSave }: EditLineItemModalProps) {
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lineItem) {
      setAdjustmentAmount(lineItem.adjustment_amount)
      setError(null)
    }
  }, [lineItem])

  if (!isOpen || !lineItem) return null

  const handleSave = async () => {
    if (saving) return

    setSaving(true)
    setError(null)

    try {
      await onSave(lineItem.id, adjustmentAmount)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save adjustment amount')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setAdjustmentAmount(lineItem.adjustment_amount)
    setError(null)
    onClose()
  }

  const calculateNewFinalAmount = () => {
    const adjustmentValue = adjustmentAmount || '0'
    const actual = new Decimal(lineItem.actual_amount)
    const adjustment = new Decimal(adjustmentValue)
    return actual.add(adjustment).toFixed(20)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        padding: '2rem',
        minWidth: '500px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #555'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff' }}>
          Edit Line Item Adjustment
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#ccc' }}>Line Item:</strong>
            <div style={{ marginTop: '0.25rem' }}>{lineItem.name}</div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <strong style={{ color: '#ccc' }}>Booked Amount:</strong>
              <div style={{ marginTop: '0.25rem' }}>${new Decimal(lineItem.booked_amount).toFixed(20)}</div>
            </div>
            <div>
              <strong style={{ color: '#ccc' }}>Actual Amount:</strong>
              <div style={{ marginTop: '0.25rem' }}>${new Decimal(lineItem.actual_amount).toFixed(20)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontWeight: 'bold' }}>
              Adjustment Amount:
            </label>
            <input
              type="number"
              step="0.01"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3a3a3a',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '1rem'
              }}
              placeholder="Enter adjustment amount"
              disabled={saving}
            />
          </div>

          <div>
            <strong style={{ color: '#ccc' }}>New Final Amount:</strong>
            <div style={{ 
              marginTop: '0.25rem', 
              fontSize: '1.1em', 
              color: '#4CAF50',
              fontWeight: 'bold'
            }}>
              ${calculateNewFinalAmount()}
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#ff6b6b',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '1rem' 
        }}>
          <button
            onClick={handleCancel}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: saving ? '#666' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditLineItemModal