import { useTranslation } from 'react-i18next';

export function createPlaceholderPage(title, description) {
  return function PlaceholderPage() {
    const { t } = useTranslation();

    return (
      <main>
        <h1>{t(title)}</h1>
        <p>{t(description)}</p>
        <p>{t('Future {{title}} features coming soon.', { title: t(title) })}</p>
      </main>
    );
  };
}