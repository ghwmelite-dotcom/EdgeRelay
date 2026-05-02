import { describe, it, expect } from 'vitest';
import { parseSageResponse } from '../src/intentParser.js';

describe('parseSageResponse', () => {
  it('parses brief and intent', () => {
    const text = `<brief>Morning, Oz. Look at this.

Some narrative.

*What's your plan for EUR?*</brief>
<intent>
{"greenlit":[{"symbol":"EURUSD","direction":"long","conviction":"high"}],
 "skip":[{"symbol":"NAS100","reason":"bear-flip"}],
 "watch":[],"hero_symbol":"EURUSD"}
</intent>`;
    const r = parseSageResponse(text);
    expect(r.kind).toBe('ok');
    if (r.kind !== 'ok') return;
    expect(r.briefMd).toContain('Look at this');
    expect(r.intent.greenlit).toHaveLength(1);
    expect(r.intent.greenlit[0]!.symbol).toBe('EURUSD');
    expect(r.intent.hero_symbol).toBe('EURUSD');
  });

  it('returns parse_error when blocks missing', () => {
    expect(parseSageResponse('plain text').kind).toBe('parse_error');
  });

  it('returns parse_error when intent JSON invalid', () => {
    const text = `<brief>x</brief><intent>{not json}</intent>`;
    expect(parseSageResponse(text).kind).toBe('parse_error');
  });

  it('returns parse_error when intent missing required fields', () => {
    const text = `<brief>x</brief><intent>{"greenlit":[]}</intent>`;
    expect(parseSageResponse(text).kind).toBe('parse_error');
  });

  it('accepts hero_symbol as null', () => {
    const text = `<brief>x</brief><intent>{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}</intent>`;
    const r = parseSageResponse(text);
    expect(r.kind).toBe('ok');
  });

  it('handles streamed text where prefill was already prepended', () => {
    // The LLM client prepends the prefill before streaming, so the parser
    // sees the complete <brief>...</brief><intent>...</intent> wrapper.
    const text = `<brief>
Morning, Oz. Look at this.</brief>
<intent>{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}</intent>`;
    expect(parseSageResponse(text).kind).toBe('ok');
  });

  it('handles whitespace and newlines around blocks', () => {
    const text = `   <brief>

    Some content

    </brief>

    <intent>{"greenlit":[],"skip":[],"watch":[],"hero_symbol":null}</intent>   `;
    expect(parseSageResponse(text).kind).toBe('ok');
  });
});
