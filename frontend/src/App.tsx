import { AuthPage } from './features/auth/AuthPage';
import OnboardingPage from './features/onboarding/OnboardingPage';

function App() {
  // Toggle between AuthPage and OnboardingPage
  // Change to <AuthPage /> to view the login/signup form
  return <OnboardingPage />;
}

export default App;
