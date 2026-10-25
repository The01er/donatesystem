declare module 'mc-ping-updated' {
  interface McPingResult {
    players: {
      online: number;
      max: number;
    };
  }

  type McPingCallback = (err: Error | null, result?: McPingResult) => void;

  export default function mcPing(
    host: string,
    port: number,
    callback: McPingCallback,
    timeout?: number,
    protocol?: number,
  ): void;
}
