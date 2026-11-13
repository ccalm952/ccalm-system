import * as React from "react";

import { Button } from "@/components/ui/button";

type Props = { resetKey: string; children: React.ReactNode };
type State = { error: Error | null };

/** 页面渲染出错时只替换内容区，导航仍可用；resetKey 变化（切换页面）时恢复 */
export class PageErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-base font-medium">页面出错了</div>
        <div className="max-w-xl text-sm text-muted-foreground">
          {this.state.error.message}
        </div>
        <Button type="button" onClick={() => window.location.reload()}>
          重新加载
        </Button>
      </div>
    );
  }
}
