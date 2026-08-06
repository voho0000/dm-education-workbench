/**
 * 輸入指紋：一份報告到底是從哪一份資料產生的。
 *
 * 要解決的情況：換了一份病人資料、按下產出、其中一次呼叫失敗，畫面上留著的
 * 可能是上一位的報告——而報告本身看不出是誰的，下載檔名也一樣。實務上這是
 * 最容易發生也最難察覺的錯誤，因為兩份報告長得幾乎一樣。
 *
 * 做法：產出時把當下輸入的指紋寫進報告抬頭，畫面隨時比對「目前輸入的指紋」
 * 與「這份報告產生時的指紋」，不同就出警告。指紋也印在下載的檔案裡，所以
 * 一份印出來的報告事後仍可追回是哪一份輸入。
 *
 * 不是密碼學用途，只是碰撞機率夠低的變更偵測，所以用同步的 FNV-1a，
 * 不用非同步的 crypto.subtle——它在渲染路徑上會逼所有呼叫端變成 async。
 */

/** FNV-1a 32 位元。跑兩組不同 offset basis 再串起來，得到 64 位元等級的空間。 */
function fnv1a(text: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    // 乘以 16777619，用位移避免 32 位元乘法溢位
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/*
 * 只用字母，不用十六進位。
 *
 * 指紋印在報告抬頭，而報告有一項機械檢查是「每個數字都要能在輸入資料中找到」。
 * 十六進位字串裡的數字會被當成報告裡的數值——實測五份病人全部因此誤判成
 * 驗證失敗（a973b87c… 被讀成 973 與 87）。純字母不可能撞上那個掃描。
 *
 * 順帶也比較好讀：醫師掃過抬頭時，一串含數字的碼會讓人多看一眼確認它不是
 * 檢驗值。
 */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz"; // 去掉 l 與 o，避免和 1、0 混淆

/**
 * 回傳 12 個小寫字母。
 *
 * 空字串也回傳指紋（不是空字串）——回傳空的話，「沒有輸入」與「指紋相同」
 * 在比對時會長得一樣，而那正是要抓的錯誤。
 */
export function inputFingerprint(text: string): string {
  let a = fnv1a(text, 0x811c9dc5);
  let b = fnv1a(text, 0x01000193);
  let out = "";
  for (let i = 0; i < 12; i += 1) {
    const source = i < 6 ? a : b;
    out += ALPHABET[source % ALPHABET.length];
    if (i < 6) a = Math.floor(a / ALPHABET.length);
    else b = Math.floor(b / ALPHABET.length);
  }
  return out;
}

/** 報告抬頭與畫面上共用的寫法，兩邊必須一致才比對得起來。 */
export function fingerprintLabel(fingerprint: string): string {
  return `輸入指紋 ${fingerprint}`;
}
