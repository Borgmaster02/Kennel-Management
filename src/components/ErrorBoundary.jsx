import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    console.error("App error:", error, info);
  }

  resetView = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="error-screen">
        <section className="panel error-panel">
          <p className="eyebrow">Recovery</p>
          <h1>The app could not open this view.</h1>
          <p className="muted-text">This is usually caused by old or broken local browser data. Your backup files can still be imported after resetting local data.</p>
          <p className="error-message">{this.state.message}</p>
          <div className="button-row">
            <button className="primary" onClick={this.resetView}>Try again</button>
            <button className="ghost danger-text" onClick={this.props.onReset}>Reset local data</button>
          </div>
        </section>
      </main>
    );
  }
}
