import { Environment, LogLevel, Paddle, PaddleOptions } from '@paddle/paddle-node-sdk';

export function getPaddleInstance() {
  const paddleOptions: PaddleOptions = {
    environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as Environment) ?? Environment.sandbox,
    logLevel: LogLevel.error,
  };

  if (!process.env.PRIVATE_PADDLE_CLIENT_APIKEY) {
    console.error('Paddle API key is missing');
  }

  return new Paddle(process.env.PRIVATE_PADDLE_CLIENT_APIKEY!, paddleOptions);
}
