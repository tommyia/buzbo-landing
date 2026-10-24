import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractFaq, faqPageJsonLd, htmlToText } from './faq.ts';

describe('extractFaq', () => {
  it('reads questions as headings under an FAQ heading', () => {
    const html =
      '<h2>Intro</h2><p>Body.</p>' +
      '<h2>Frequently asked questions</h2>' +
      '<h3>Is it free?</h3><p>Yes.</p><p>Events cost a small fee.</p>' +
      '<h3>Where does it launch?</h3><ul><li>Amsterdam</li><li>Rotterdam</li></ul>';
    assert.deepEqual(extractFaq(html), [
      { question: 'Is it free?', answer: 'Yes.\n\nEvents cost a small fee.' },
      { question: 'Where does it launch?', answer: 'Amsterdam\nRotterdam' },
    ]);
  });

  it('reads questions as paragraphs that open in bold', () => {
    const html =
      '<h2>FAQ</h2>' +
      '<p><strong>Do I need a CV?</strong> No. Your profile does the work.</p>' +
      '<p><strong>Can I join events without the app?</strong></p><p>Yes, with a ticket.</p>';
    assert.deepEqual(extractFaq(html), [
      { question: 'Do I need a CV?', answer: 'No. Your profile does the work.' },
      { question: 'Can I join events without the app?', answer: 'Yes, with a ticket.' },
    ]);
  });

  it('ignores question headings outside an FAQ section', () => {
    const html =
      '<h2>Why does networking feel fake?</h2><p>Because.</p>' +
      '<p><strong>Does it feel like work?</strong> Some days.</p>';
    assert.deepEqual(extractFaq(html), []);
  });

  it('ends the section at the next heading of the same level', () => {
    const html =
      '<h2>FAQs</h2><h3>Is it free?</h3><p>Yes.</p>' +
      '<h2>Final thoughts</h2><h3>Why now?</h3><p>Not part of the FAQ.</p>';
    assert.deepEqual(extractFaq(html), [{ question: 'Is it free?', answer: 'Yes.' }]);
  });

  it('drops a question with no answer', () => {
    assert.deepEqual(extractFaq('<h2>FAQ</h2><h3>Is it free?</h3><h3>Who is it for?</h3><p>Everyone.</p>'), [
      { question: 'Who is it for?', answer: 'Everyone.' },
    ]);
  });

  it('returns [] for empty input', () => {
    assert.deepEqual(extractFaq(''), []);
  });
});

describe('htmlToText', () => {
  it('strips tags and decodes entities', () => {
    assert.equal(htmlToText('Tom&amp;Jerry&nbsp;<em>don&rsquo;t</em> &#8220;stop&#x201D;'), 'Tom&Jerry don’t “stop”');
  });
});

describe('faqPageJsonLd', () => {
  it('builds a FAQPage', () => {
    assert.deepEqual(faqPageJsonLd([{ question: 'Is it free?', answer: 'Yes.' }]), {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Is it free?', acceptedAnswer: { '@type': 'Answer', text: 'Yes.' } }],
    });
  });

  it('is null with no questions', () => {
    assert.equal(faqPageJsonLd([]), null);
  });
});
