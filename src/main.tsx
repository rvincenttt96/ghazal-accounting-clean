import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FCF9F6] p-6 flex flex-col items-center justify-center text-[#2D2424]" dir="rtl">
          <div className="bg-white border border-[#E5E1DA] p-8 rounded-3xl max-w-lg w-full shadow-xl text-center space-y-4">
            <h2 className="text-xl font-bold text-[#B93815]">خطا در اجرای برنامه</h2>
            <p className="text-sm text-[#8B7E74]">متأسفانه مشکلی در بارگذاری رخ داده است:</p>
            <div className="bg-[#FDF0ED] border border-[#F6D0C7] text-[#B93815] p-3 rounded-xl text-xs font-mono text-right overflow-auto max-h-40">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#2D2424] text-[#FCF9F6] px-6 py-2.5 rounded-full text-xs font-medium hover:bg-[#4A3D3D] transition-colors"
            >
              تلاش مجدد (بارگذاری دوباره)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

