
/*
Get CSRF token from cookies
*/
export const getCsrfToken = (): string | null => {
  const name = 'csrftoken'
  let cookieValue: string | null = null
  
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

/*
Ensure CSRF token is available by making a GET request if needed
*/
export const ensureCsrfToken = async (): Promise<string> => {
  let csrfToken = getCsrfToken()
  
  if (!csrfToken) {
    try {
      // Make a GET request to any Django view to get CSRF token in cookies
      await fetch('/api/ping_pong/', {
        method: 'GET',
        credentials: 'include',
      })
      csrfToken = getCsrfToken()
    } catch (error) {
      console.error('Failed to get CSRF token:', error)
    }
  }
  
  return csrfToken || ''
}

/*
  Enhanced fetch function that automatically includes CSRF token for unsafe methods
*/
export const csrfFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const method = options.method?.toUpperCase() || 'GET'
  const isUnsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  
  if (isUnsafeMethod) {
    const csrfToken = await ensureCsrfToken()
    
    if (csrfToken) {
      options.headers = {
        ...options.headers,
        'X-CSRFToken': csrfToken,
      }
    }
  }
  
  return fetch(url, {
    credentials: 'include',
    ...options,
  })
}
