export interface ServerStatus {
  online: boolean;
  onlinePlayers: number;
  maxPlayers: number;
}

export interface DeliveryResult {
  ok: boolean;
  error?: string;
}

export interface CommandResult {
  ok: boolean;
  output?: string;
  error?: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
}

export interface GameAdapter {
  readonly gameType: string;
  readonly label: string;

  getServerStatus(server: { ipAddress: string | null }): Promise<ServerStatus>;

  isDeliverable(server: {
    rconHost: string | null;
    rconPort: number | null;
    rconPassword: string | null;
  }): boolean;

  deliverOrder(orderId: string, serverId: string): Promise<DeliveryResult>;

  executeCommands(
    server: { rconHost: string | null; rconPort: number | null; rconPassword: string | null },
    commands: string[],
    recipientName: string,
    orderId: string,
  ): Promise<{ ok: boolean; results: CommandResult[] }>;

  testConnection(server: {
    rconHost: string | null;
    rconPort: number | null;
    rconPassword: string | null;
  }): Promise<ConnectionTestResult>;

  sanitizeRecipient(name: string): string;
}
