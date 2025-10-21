import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, buffCV, optionalCV, intCV, asciiCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_CONTENT = 101;
const ERR_INVALID_HASH = 102;
const ERR_INVALID_CHANNEL_ID = 103;
const ERR_INVALID_GEO_LAT = 105;
const ERR_INVALID_GEO_LONG = 106;
const ERR_INVALID_MEDIA_REF = 107;
const ERR_MESSAGE_ALREADY_EXISTS = 108;
const ERR_MAX_MESSAGES_EXCEEDED = 110;
const ERR_INVALID_PRIORITY = 113;
const ERR_INVALID_EXPIRY = 114;
const ERR_INVALID_SIGNATURE = 115;
const ERR_AUTHORITY_NOT_VERIFIED = 116;
const ERR_INVALID_UPDATE_PARAM = 117;
const ERR_INVALID_MESSAGE_TYPE = 119;
const ERR_INVALID_LANGUAGE = 120;

interface Message {
  content: string;
  hash: Uint8Array;
  sender: string;
  timestamp: number;
  channelId: number;
  geoLat: number | null;
  geoLong: number | null;
  mediaRef: string | null;
  status: boolean;
  priority: number;
  expiry: number | null;
  signature: Uint8Array | null;
  messageType: string;
  language: string;
}

interface MessageUpdate {
  updateStatus: boolean;
  updatePriority: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class MessageStorageMock {
  state: {
    nextMessageId: number;
    maxMessagesPerChannel: number;
    storageFee: number;
    authorityContract: string | null;
    messages: Map<number, Message>;
    messageUpdates: Map<number, MessageUpdate>;
    messagesByHash: Map<string, number>;
    messagesByChannel: Map<number, number[]>;
  } = {
    nextMessageId: 0,
    maxMessagesPerChannel: 10000,
    storageFee: 10,
    authorityContract: null,
    messages: new Map(),
    messageUpdates: new Map(),
    messagesByHash: new Map(),
    messagesByChannel: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextMessageId: 0,
      maxMessagesPerChannel: 10000,
      storageFee: 10,
      authorityContract: null,
      messages: new Map(),
      messageUpdates: new Map(),
      messagesByHash: new Map(),
      messagesByChannel: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setStorageFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newFee < 0) return { ok: false, value: false };
    this.state.storageFee = newFee;
    return { ok: true, value: true };
  }

  setMaxMessagesPerChannel(newMax: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newMax <= 0) return { ok: false, value: false };
    this.state.maxMessagesPerChannel = newMax;
    return { ok: true, value: true };
  }

  submitMessage(
    content: string,
    hash: Uint8Array,
    channelId: number,
    geoLat: number | null,
    geoLong: number | null,
    mediaRef: string | null,
    priority: number,
    expiry: number | null,
    signature: Uint8Array | null,
    messageType: string,
    language: string
  ): Result<number> {
    const channelMessages = this.state.messagesByChannel.get(channelId) || [];
    if (channelMessages.length >= this.state.maxMessagesPerChannel) return { ok: false, value: ERR_MAX_MESSAGES_EXCEEDED };
    if (!content || content.length > 500) return { ok: false, value: ERR_INVALID_CONTENT };
    if (hash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (channelId <= 0) return { ok: false, value: ERR_INVALID_CHANNEL_ID };
    if (geoLat !== null && (geoLat < -90000000 || geoLat > 90000000)) return { ok: false, value: ERR_INVALID_GEO_LAT };
    if (geoLong !== null && (geoLong < -180000000 || geoLong > 180000000)) return { ok: false, value: ERR_INVALID_GEO_LONG };
    if (mediaRef !== null && mediaRef.length > 256) return { ok: false, value: ERR_INVALID_MEDIA_REF };
    if (priority > 10) return { ok: false, value: ERR_INVALID_PRIORITY };
    if (expiry !== null && expiry <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRY };
    if (signature !== null && signature.length !== 65) return { ok: false, value: ERR_INVALID_SIGNATURE };
    if (!["text", "alert", "update"].includes(messageType)) return { ok: false, value: ERR_INVALID_MESSAGE_TYPE };
    if (!language || language.length > 10) return { ok: false, value: ERR_INVALID_LANGUAGE };
    const hashKey = hash.toString();
    if (this.state.messagesByHash.has(hashKey)) return { ok: false, value: ERR_MESSAGE_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.storageFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextMessageId;
    const message: Message = {
      content,
      hash,
      sender: this.caller,
      timestamp: this.blockHeight,
      channelId,
      geoLat,
      geoLong,
      mediaRef,
      status: true,
      priority,
      expiry,
      signature,
      messageType,
      language,
    };
    this.state.messages.set(id, message);
    this.state.messagesByHash.set(hashKey, id);
    this.state.messagesByChannel.set(channelId, [...channelMessages, id]);
    this.state.nextMessageId++;
    return { ok: true, value: id };
  }

  getMessage(id: number): Message | null {
    return this.state.messages.get(id) || null;
  }

  updateMessage(id: number, updateStatus: boolean, updatePriority: number): Result<boolean> {
    const message = this.state.messages.get(id);
    if (!message) return { ok: false, value: false };
    if (message.sender !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (updatePriority > 10) return { ok: false, value: ERR_INVALID_PRIORITY };

    const updated: Message = {
      ...message,
      status: updateStatus,
      priority: updatePriority,
      timestamp: this.blockHeight,
    };
    this.state.messages.set(id, updated);
    this.state.messageUpdates.set(id, {
      updateStatus,
      updatePriority,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getMessageCount(): Result<number> {
    return { ok: true, value: this.state.nextMessageId };
  }

  checkMessageExistence(hash: Uint8Array): Result<boolean> {
    return { ok: true, value: this.state.messagesByHash.has(hash.toString()) };
  }

  getMessagesForChannel(channelId: number): number[] {
    return this.state.messagesByChannel.get(channelId) || [];
  }
}

describe("MessageStorage", () => {
  let contract: MessageStorageMock;

  beforeEach(() => {
    contract = new MessageStorageMock();
    contract.reset();
  });

  it("submits a message successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.submitMessage(
      "Alert: Evacuate area",
      hash,
      1,
      40000000,
      -75000000,
      "https://example.com/image.jpg",
      5,
      null,
      null,
      "alert",
      "en"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const message = contract.getMessage(0);
    expect(message?.content).toBe("Alert: Evacuate area");
    expect(message?.channelId).toBe(1);
    expect(message?.priority).toBe(5);
    expect(contract.stxTransfers).toEqual([{ amount: 10, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate message hashes", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.submitMessage(
      "First message",
      hash,
      1,
      null,
      null,
      null,
      1,
      null,
      null,
      "text",
      "en"
    );
    const result = contract.submitMessage(
      "Second message",
      hash,
      1,
      null,
      null,
      null,
      2,
      null,
      null,
      "text",
      "en"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MESSAGE_ALREADY_EXISTS);
  });

  it("rejects submission without authority contract", () => {
    const hash = new Uint8Array(32).fill(1);
    const result = contract.submitMessage(
      "No auth",
      hash,
      1,
      null,
      null,
      null,
      1,
      null,
      null,
      "text",
      "en"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid content", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const longContent = "a".repeat(501);
    const result = contract.submitMessage(
      longContent,
      hash,
      1,
      null,
      null,
      null,
      1,
      null,
      null,
      "text",
      "en"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CONTENT);
  });

  it("rejects invalid hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const invalidHash = new Uint8Array(31).fill(1);
    const result = contract.submitMessage(
      "Invalid hash",
      invalidHash,
      1,
      null,
      null,
      null,
      1,
      null,
      null,
      "text",
      "en"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects invalid geo lat", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.submitMessage(
      "Invalid lat",
      hash,
      1,
      90000001,
      null,
      null,
      1,
      null,
      null,
      "text",
      "en"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GEO_LAT);
  });

  it("updates a message successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.submitMessage(
      "Original",
      hash,
      1,
      null,
      null,
      null,
      5,
      null,
      null,
      "text",
      "en"
    );
    const result = contract.updateMessage(0, false, 10);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const message = contract.getMessage(0);
    expect(message?.status).toBe(false);
    expect(message?.priority).toBe(10);
    const update = contract.state.messageUpdates.get(0);
    expect(update?.updateStatus).toBe(false);
    expect(update?.updatePriority).toBe(10);
  });

  it("rejects update for non-existent message", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateMessage(99, false, 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-sender", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.submitMessage(
      "Test",
      hash,
      1,
      null,
      null,
      null,
      5,
      null,
      null,
      "text",
      "en"
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateMessage(0, false, 10);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets storage fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setStorageFee(20);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.storageFee).toBe(20);
  });

  it("rejects storage fee change without authority", () => {
    const result = contract.setStorageFee(20);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct message count", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash1 = new Uint8Array(32).fill(1);
    const hash2 = new Uint8Array(32).fill(2);
    contract.submitMessage("Msg1", hash1, 1, null, null, null, 1, null, null, "text", "en");
    contract.submitMessage("Msg2", hash2, 1, null, null, null, 2, null, null, "text", "en");
    const result = contract.getMessageCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks message existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.submitMessage("Test", hash, 1, null, null, null, 1, null, null, "text", "en");
    const result = contract.checkMessageExistence(hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const fakeHash = new Uint8Array(32).fill(3);
    const result2 = contract.checkMessageExistence(fakeHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects submission with max messages exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxMessagesPerChannel = 1;
    const hash1 = new Uint8Array(32).fill(1);
    contract.submitMessage("Msg1", hash1, 1, null, null, null, 1, null, null, "text", "en");
    const hash2 = new Uint8Array(32).fill(2);
    const result = contract.submitMessage("Msg2", hash2, 1, null, null, null, 2, null, null, "text", "en");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_MESSAGES_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});