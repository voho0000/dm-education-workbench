/**
 * 建置識別碼，顯示在頁尾。
 *
 * 用途：使用者回報「按了沒反應」時，第一件事是確認他看到的是不是舊版快取。
 * 沒有這個標記，任何人都無法否證「停留在快取的舊版頁面」這個可能。
 */

declare const __DM_BUILD_ID__: string | undefined;

export const BUILD_ID: string = typeof __DM_BUILD_ID__ === "string" ? __DM_BUILD_ID__ : "dev";
