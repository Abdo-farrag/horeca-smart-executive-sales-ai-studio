export class AnalyticsError extends Error {
  readonly code: string;
  readonly operation?: string;
  readonly details?: unknown;

  constructor(options: {
    message: string;
    code: string;
    operation?: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super(options.message, {
      cause: options.cause,
    });

    this.name = 'AnalyticsError';
    this.code = options.code;
    this.operation = options.operation;
    this.details = options.details;
  }
}
