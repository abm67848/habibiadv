import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>This route is not part of the application yet.</p>
      <Link to="/">Return to the public website</Link>
    </main>
  );
}