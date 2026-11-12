export function createPlaceholderPage(title, description) {
  return function PlaceholderPage() {
    return (
      <main>
        <h1>{title}</h1>
        <p>{description}</p>
        <p>Placeholder for future {title.toLowerCase()} features.</p>
      </main>
    );
  };
}