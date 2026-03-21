export function TintedBadge({ label, type }) {
  if (!label) return null;

  const base =
    'px-2 pt-1 pb-1 rounded text-xs font-semibold uppercase tracking-wide border border-transparent';

  const DEFAULT =
    'bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-transparent';

  const METHOD_STYLES = {
    GET: 'bg-blue-200 text-blue-900 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-transparent',
    POST: 'bg-green-200 text-green-900 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-transparent',
    DELETE:
      'bg-red-200 text-red-900 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-transparent',
    DEFAULT:
      'bg-orange-200 text-orange-900 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-transparent',
  };

  const CATEGORY_STYLES = {
    backend:
      'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-transparent',
    frontend:
      'bg-indigo-200 text-indigo-900 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-transparent',
    infrastructure:
      'bg-teal-200 text-teal-900 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-transparent',
  };

  const TYPE_STYLES = {
    role: 'bg-purple-200 text-purple-900 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-transparent',
    type: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-900/50 dark:text-sky-300 dark:border-transparent',
    behavior:
      'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-transparent',
  };

  let styles = DEFAULT;

  if (type === 'method') {
    styles = METHOD_STYLES[label] || METHOD_STYLES.DEFAULT;
  } else if (type === 'category') {
    styles = CATEGORY_STYLES[label] || DEFAULT;
  } else if (TYPE_STYLES[type]) {
    styles = TYPE_STYLES[type];
  }

  return <span className={`${base} ${styles}`}>{label}</span>;
}
