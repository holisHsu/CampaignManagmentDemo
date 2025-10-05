import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import EditLineItemModal from './EditLineItemModal'
import { csrfFetch } from '../utils/csrf'
import Decimal from 'decimal.js'
import { getBudgetRateStyle, formatBudgetRate } from '../utils/budgetStyles'

interface LineItem {
  id: number
  name: string
  booked_amount: string
  actual_amount: string
  adjustment_amount: string
  final_amount: string
  budget_fullfillment_rate: number
  created_at: string
  updated_at: string
}

interface CampaignDetail {
  id: number
  name: string
  created_at: string
  potential_invoice_amount: string
  line_items: LineItem[]
}

function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingLineItem, setEditingLineItem] = useState<LineItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [csvDownloading, setCsvDownloading] = useState(false)

  const fetchCampaignDetail = async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/campaign/${id}/`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch campaign detail: ${response.statusText}`)
      }

      const data: CampaignDetail = await response.json()
      setCampaign(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaignDetail()
  }, [id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }


  const handleBackToList = () => {
    const fromPage = location.state?.fromPage
    if (fromPage && fromPage > 1) {
      navigate(`/?page=${fromPage}`)
    } else {
      navigate('/')
    }
  }

  const handleEditAdjustment = (lineItem: LineItem) => {
    setEditingLineItem(lineItem)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingLineItem(null)
  }

  const handleSaveAdjustment = async (lineItemId: number, newAdjustmentAmount: string) => {
    try {
      const response = await csrfFetch(`/api/line_item/${lineItemId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adjustment_amount: newAdjustmentAmount
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update line item: ${response.statusText}`)
      }

      await fetchCampaignDetail()
    } catch (err) {
      throw err
    }
  }

  const handleLineItemCsvDownload = async () => {
    if (csvDownloading || !id) return

    setCsvDownloading(true)
    try {
      const response = await csrfFetch(`/api/campaign/${id}/line_item/csv/`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Failed to download line items CSV: ${response.statusText}`)
      }

      // Create blob from response
      const blob = await response.blob()
      
      // Extract filename from Content-Disposition header
      let filename = `line_items_export_${id}.csv` // default filename
      const contentDisposition = response.headers.get('Content-Disposition')
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^"]+)"?/)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download line items CSV')
    } finally {
      setCsvDownloading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Loading campaign details...
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div style={{
          backgroundColor: '#ff6b6b',
          color: 'white',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          Error: {error}
        </div>
        <button 
          onClick={handleBackToList}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Campaign List
        </button>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Campaign not found
      </div>
    )
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1>Campaign Detail</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleLineItemCsvDownload}
            disabled={csvDownloading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: csvDownloading ? '#666' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: csvDownloading ? 'not-allowed' : 'pointer',
              opacity: csvDownloading ? 0.6 : 1
            }}
          >
            {csvDownloading ? 'Downloading...' : 'Download Line Items CSV'}
          </button>
          <button 
            onClick={handleBackToList}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to List
          </button>
          <button 
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Campaign Data Section */}
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#fff' }}>Campaign Information</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <strong style={{ color: '#ccc' }}>ID:</strong>
            <div style={{ marginTop: '0.25rem' }}>{campaign.id}</div>
          </div>
          <div>
            <strong style={{ color: '#ccc' }}>Name:</strong>
            <div style={{ marginTop: '0.25rem' }}>{campaign.name}</div>
          </div>
          <div>
            <strong style={{ color: '#ccc' }}>Created At:</strong>
            <div style={{ marginTop: '0.25rem' }}>{formatDate(campaign.created_at)}</div>
          </div>
          <div>
            <strong style={{ color: '#ccc' }}>Potential Invoice Amount:</strong>
            <div style={{ marginTop: '0.25rem', fontSize: '1.1em', color: '#4CAF50' }}>
              ${new Decimal(campaign.potential_invoice_amount).toFixed(20)}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #555' }}>
          <h2 style={{ margin: 0, color: '#fff' }}>Line Items ({campaign.line_items.length})</h2>
        </div>
        
        {campaign.line_items.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
            No line items found for this campaign.
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#3a3a3a' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Booked Amount</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Actual Amount</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Adjustment Amount</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Final Amount</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Budget Fullfillment Rate</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {campaign.line_items.map((lineItem) => (
                <tr key={lineItem.id} style={{ borderBottom: '1px solid #444' }}>
                  <td style={{ padding: '1rem' }}>{lineItem.id}</td>
                  <td style={{ padding: '1rem' }}>{lineItem.name}</td>
                  <td style={{ padding: '1rem' }}>${new Decimal(lineItem.booked_amount).toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>${new Decimal(lineItem.actual_amount).toFixed(2)}</td>
                  <td 
                    onClick={() => handleEditAdjustment(lineItem)}
                    style={{ 
                      padding: '1rem',
                      cursor: 'pointer',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'
                    }}
                    title="Click to edit adjustment amount"
                  >
                    ${new Decimal(lineItem.adjustment_amount).toFixed(2)} ✏️
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: '#4CAF50' }}>
                    ${new Decimal(lineItem.final_amount).toFixed(2)}
                  </td>
                  <td style={{ 
                    padding: '1rem',
                    ...getBudgetRateStyle(lineItem.budget_fullfillment_rate)
                  }}>
                    {formatBudgetRate(lineItem.budget_fullfillment_rate)}
                  </td>
                  <td style={{ padding: '1rem' }}>{formatDate(lineItem.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EditLineItemModal
        lineItem={editingLineItem}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAdjustment}
      />
    </div>
  )
}

export default CampaignDetail