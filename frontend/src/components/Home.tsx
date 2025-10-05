import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { csrfFetch } from '../utils/csrf'
import Decimal from 'decimal.js'
import { getBudgetRateStyle, formatBudgetRate } from '../utils/budgetStyles'

interface Campaign {
  id: number
  name: string
  created_at: string
  potential_invoice_amount: string
  budget_fullfillment_rate: number
}

interface CampaignListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Campaign[]
}

function Home() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [csvDownloading, setCsvDownloading] = useState(false)

  const pageSize = 20
  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchCampaigns = async (page: number = 1, updateUrl: boolean = true) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/campaign/?page=${page}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.status === 404 && (await response.text()).includes('Invalid page')) {
        // Handle max page exceeded
        fetchCampaigns(1, true)
        return
      }
      else if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`)
      }

      const data: CampaignListResponse = await response.json()
      
      setCampaigns(data.results)
      setTotalCount(data.count)
      setHasNext(data.next !== null)
      setHasPrevious(data.previous !== null)
      setCurrentPage(page)
      
      // Update URL query string to reflect current page
      if (updateUrl) {
        if (page === 1) {
          // Remove page parameter for page 1 to keep URL clean
          setSearchParams({})
        } else {
          setSearchParams({ page: page.toString() })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const pageParam = searchParams.get('page')
    const pageFromUrl = pageParam ? parseInt(pageParam, 10) : 1  // default to 1 if no page param
    const validPage = isNaN(pageFromUrl) || pageFromUrl < 1 ? 1 : pageFromUrl
    
    fetchCampaigns(validPage, false) // Don't update URL since we're reading from URL
  }, [searchParams])

  const handlePageChange = (page: number) => {
    setSearchParams({ page: page.toString() })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }


  const handleCampaignClick = (campaignId: number) => {
    navigate(`/campaign/${campaignId}`, { 
      state: { fromPage: currentPage } 
    })
  }

  const handleCsvDownload = async () => {
    if (csvDownloading) return

    setCsvDownloading(true)
    try {
      const response = await csrfFetch('/api/campaign/csv/', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Failed to download CSV: ${response.statusText}`)
      }

      const blob = await response.blob()
      
      let filename = 'campaigns_export.csv' // default filename
      const contentDisposition = response.headers.get('Content-Disposition')
      
      if (contentDisposition) {
        // Use filename from Content-Disposition header if possible
        const matches = contentDisposition.match(/filename="?([^"]+)"?/)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download CSV')
    } finally {
      setCsvDownloading(false)
    }
  }

  return (
    <>
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1>Campaign List</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={handleCsvDownload}
              disabled={csvDownloading}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: csvDownloading ? '#666' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: csvDownloading ? 'not-allowed' : 'pointer',
                opacity: csvDownloading ? 0.6 : 1
              }}
            >
              {csvDownloading ? 'Downloading...' : 'Download CSV'}
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

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Loading campaigns...
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#ff6b6b',
            color: 'white',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <p>Total campaigns: {totalCount} | Page {currentPage} of {totalPages}</p>
            </div>

            <div style={{
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#3a3a3a' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Name</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Potential Invoice Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Budget Fullfillment Rate</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #555' }}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr 
                      key={campaign.id} 
                      onClick={() => handleCampaignClick(campaign.id)}
                      style={{ 
                        borderBottom: '1px solid #444',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#3a3a3a'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <td style={{ padding: '1rem' }}>{campaign.id}</td>
                      <td style={{ padding: '1rem' }}>{campaign.name}</td>
                      <td style={{ padding: '1rem' }}>${new Decimal(campaign.potential_invoice_amount).toFixed(2)}</td>
                      <td style={{ 
                        padding: '1rem',
                        ...getBudgetRateStyle(campaign.budget_fullfillment_rate)
                      }}>
                        {formatBudgetRate(campaign.budget_fullfillment_rate)}
                      </td>
                      <td style={{ padding: '1rem' }}>{formatDate(campaign.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevious}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: hasPrevious ? '#4CAF50' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: hasPrevious ? 'pointer' : 'not-allowed'
                }}
              >
                Previous
              </button>
              
              <span>Page {currentPage} of {totalPages}</span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNext}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: hasNext ? '#4CAF50' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: hasNext ? 'pointer' : 'not-allowed'
                }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Home