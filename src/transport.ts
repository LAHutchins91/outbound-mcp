/** Stdio when stdin is not a terminal. Streamable HTTP otherwise. */
export function useStdioTransport(stdin: { isTTY?: boolean } = process.stdin): boolean {
  return stdin.isTTY !== true;
}
