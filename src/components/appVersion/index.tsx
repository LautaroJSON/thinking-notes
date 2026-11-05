import "./styles.css";

const AppVersion = () => (
  <span className="app-version" aria-label={`Versión ${__APP_VERSION__}`}>
    v{__APP_VERSION__}
  </span>
);

export default AppVersion;
