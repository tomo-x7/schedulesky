import { Route, Router } from 'wouter'
import HomePage from './HomePage'
import LoginPage from './LoginPage'

function App() {
  return (
    <Router>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={HomePage} />
    </Router>
  )
}

export default App
