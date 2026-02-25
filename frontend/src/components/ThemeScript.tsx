/**
 * Inline script that runs before first paint to set theme from localStorage.
 * Prevents flash of wrong theme. Must be in document head.
 */
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){
          var t = localStorage.getItem('theme-mode');
          if (t === 'light') {
            document.documentElement.removeAttribute('class');
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.setAttribute('class', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        })();`,
      }}
    />
  );
}
