// Used only when the real `openai` package is not installed (offline sandboxes).
// Tests that reach the model are written to run without BHARATCODE_API_KEY, so
// the client is never constructed.
export default class OpenAIStub {
  constructor() {
    throw new Error('openai stub: set no BHARATCODE_API_KEY in tests');
  }
}
