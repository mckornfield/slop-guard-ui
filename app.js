// ══════════════════════════════════════════════════════════════════════════════
//  SLOP GUARD — JS port of slop_guard.py
// ══════════════════════════════════════════════════════════════════════════════

// ── Hyperparameters ───────────────────────────────────────────────────────────
const HP = {
  concentration_alpha: 2.5,
  decay_lambda: 0.04,
  claude_categories: new Set(['contrast_pairs', 'pithy_fragment', 'setup_resolution']),
  context_window_chars: 60,
  short_text_word_count: 10,
  repeated_ngram_min_n: 4,
  repeated_ngram_max_n: 8,
  repeated_ngram_min_count: 3,
  slop_word_penalty: -2,
  slop_phrase_penalty: -3,
  structural_bold_header_min: 3,
  structural_bold_header_penalty: -5,
  structural_bullet_run_min: 6,
  structural_bullet_run_penalty: -3,
  triadic_record_cap: 5,
  triadic_penalty: -1,
  triadic_advice_min: 3,
  tone_penalty: -3,
  sentence_opener_penalty: -2,
  weasel_penalty: -2,
  ai_disclosure_penalty: -10,
  placeholder_penalty: -5,
  rhythm_min_sentences: 5,
  rhythm_cv_threshold: 0.3,
  rhythm_penalty: -5,
  em_dash_words_basis: 150.0,
  em_dash_density_threshold: 1.0,
  em_dash_penalty: -3,
  contrast_record_cap: 5,
  contrast_penalty: -1,
  contrast_advice_min: 2,
  setup_resolution_record_cap: 5,
  setup_resolution_penalty: -3,
  colon_words_basis: 150.0,
  colon_density_threshold: 1.5,
  colon_density_penalty: -3,
  pithy_max_sentence_words: 6,
  pithy_record_cap: 3,
  pithy_penalty: -2,
  bullet_density_threshold: 0.40,
  bullet_density_penalty: -8,
  blockquote_min_lines: 3,
  blockquote_free_lines: 2,
  blockquote_cap: 4,
  blockquote_penalty_step: -3,
  bold_bullet_run_min: 3,
  bold_bullet_run_penalty: -5,
  horizontal_rule_min: 4,
  horizontal_rule_penalty: -3,
  phrase_reuse_record_cap: 5,
  phrase_reuse_penalty: -1,
  density_words_basis: 1000.0,
  score_min: 0,
  score_max: 100,
  band_clean_min: 80,
  band_light_min: 60,
  band_moderate_min: 40,
  band_heavy_min: 20,
};

// ── Patterns ──────────────────────────────────────────────────────────────────

const SLOP_ADJECTIVES = [
  'crucial','groundbreaking','pivotal','paramount','seamless','holistic',
  'multifaceted','meticulous','profound','comprehensive','invaluable',
  'notable','noteworthy','game-changing','revolutionary','pioneering',
  'visionary','formidable','quintessential','unparalleled',
  'stunning','breathtaking','captivating','nestled','robust',
  'innovative','cutting-edge','impactful',
];
const SLOP_VERBS = [
  'delve','delves','delved','delving','embark','embrace','elevate',
  'foster','harness','unleash','unlock','orchestrate','streamline',
  'transcend','navigate','underscore','showcase','leverage',
  'ensuring','highlighting','emphasizing','reflecting',
];
const SLOP_NOUNS = [
  'landscape','tapestry','journey','paradigm','testament','trajectory',
  'nexus','symphony','spectrum','odyssey','pinnacle','realm','intricacies',
];
const SLOP_HEDGE = [
  'notably','importantly','furthermore','additionally','particularly',
  'significantly','interestingly','remarkably','surprisingly','fascinatingly',
  'moreover','however','overall',
];
const ALL_SLOP_WORDS = [...SLOP_ADJECTIVES, ...SLOP_VERBS, ...SLOP_NOUNS, ...SLOP_HEDGE];

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const SLOP_WORD_SRC = '\\b(' + ALL_SLOP_WORDS.map(escRe).join('|') + ')\\b';

const SLOP_PHRASES_LITERAL = [
  "it's worth noting","it's important to note",
  "this is where things get interesting","here's the thing",
  "at the end of the day","in today's fast-paced",
  "as technology continues to","something shifted","everything changed",
  "the answer? it's simpler than you think","what makes this work is",
  "this is exactly","let's break this down","let's dive in",
  "in this post, we'll explore","in this article, we'll",
  "let me know if","would you like me to","i hope this helps",
  "as mentioned earlier","as i mentioned","without further ado",
  "on the other hand","in addition","in summary","in conclusion",
  "you might be wondering","the obvious question is",
  "no discussion would be complete","great question","that's a great",
  "if you want, i can","i can adapt this","i can make this",
  "here are some options","here are a few options","would you prefer",
  "shall i","if you'd like, i can","i can also",
  "in other words","put differently","that is to say","to put it simply",
  "to put it another way","what this means is","the takeaway is",
  "the bottom line is","the key takeaway","the key insight",
];

const NOT_JUST_BUT_SRC = 'not (just|only) .{1,40}, but (also )?';

const META_COMM_SRCS = [
  'would you like','let me know if','as mentioned',
  'i hope this','feel free to',"don't hesitate to",
];
const FALSE_NARR_SRCS = [
  'then something interesting happened',
  'this is where things get interesting',
  "that's when everything changed",
];
const SENTENCE_OPENER_SRCS = [
  '(?:^|[.!?]\\s+)(certainly[,! ])','(?:^|[.!?]\\s+)(absolutely[,! ])',
];
const WEASEL_SRCS = [
  '\\bsome critics argue\\b','\\bmany believe\\b','\\bexperts suggest\\b',
  '\\bstudies show\\b','\\bsome argue\\b','\\bit is widely believed\\b',
  '\\bresearch suggests\\b',
];
const AI_DISCLOSURE_SRCS = [
  '\\bas an ai\\b','\\bas a language model\\b','\\bi don\'t have personal\\b',
  '\\bi cannot browse\\b','\\bup to my last training\\b',
  '\\bas of my (last |knowledge )?cutoff\\b',"\\bi'm just an? ai\\b",
];
const PLACEHOLDER_SRC = '\\[insert [^\\]]*\\]|\\[describe [^\\]]*\\]|\\[url [^\\]]*\\]|\\[your [^\\]]*\\]|\\[todo[^\\]]*\\]';
const BOLD_HEADER_SRC = '\\*\\*[^*]+[.:]\\*\\*\\s+\\S';
const BULLET_LINE_SRC = '^(\\s*[-*]\\s|\\s*\\d+\\.\\s)';
const TRIADIC_SRC = '\\w+, \\w+, and \\w+';
const SENTENCE_SPLIT_SRC = '[.!?]["\'\u201D\u2019)\\]]*(?:\\s|$)';
const EM_DASH_SRC = '\u2014| -- ';
const CONTRAST_PAIR_SRC = '\\b(\\w+), not (\\w+)\\b';

const SETUP_RES_A_SRC =
  '\\b(this|that|these|those|it|they|we)\\s+' +
  "(isn't|aren't|wasn't|weren't|doesn't|don't|didn't|hasn't|haven't|won't|can't|couldn't|shouldn't" +
  '|is\\s+not|are\\s+not|was\\s+not|were\\s+not|does\\s+not|do\\s+not|did\\s+not' +
  '|has\\s+not|have\\s+not|will\\s+not|cannot|could\\s+not|should\\s+not)\\b' +
  '.{0,80}[.;:,]\\s*' +
  "(it's|they're|that's|he's|she's|we're|it\\s+is|they\\s+are|that\\s+is|this\\s+is" +
  '|these\\s+are|those\\s+are|he\\s+is|she\\s+is|we\\s+are|what\'s|what\\s+is' +
  '|the\\s+real|the\\s+actual|instead|rather)';

const SETUP_RES_B_SRC =
  "\\b(it's|that's|this\\s+is|they're|he's|she's|we're)\\s+not\\b" +
  '.{0,80}[.;:,]\\s*' +
  "(it's|they're|that's|he's|she's|we're|it\\s+is|they\\s+are|that\\s+is|this\\s+is" +
  '|these\\s+are|those\\s+are|what\'s|what\\s+is|the\\s+real|the\\s+actual|instead|rather)';

const ELABORATION_COLON_SRC = ': [a-z]';
const FENCED_CODE_SRC = '```[\\s\\S]*?```';
const PITHY_PIVOT_SRC = ',\\s+(?:but|yet|and|not|or)\\b';
const BULLET_DENSITY_SRC = '^\\s*[-*]\\s|^\\s*\\d+[.)]\\s';
const BOLD_TERM_BULLET_SRC = '^\\s*[-*]\\s+\\*\\*|^\\s*\\d+[.)]\\s+\\*\\*';
const HORIZONTAL_RULE_SRC = '^\\s*(?:---+|\\*\\*\\*+|___+)\\s*$';

// Helper: create fresh RegExp each call to avoid lastIndex bugs
function re(src, flags='i') { return new RegExp(src, flags); }

// ── Utilities ─────────────────────────────────────────────────────────────────

function wordCount(text) { return text.trim().split(/\s+/).filter(Boolean).length; }

function stripCodeBlocks(text) { return text.replace(new RegExp(FENCED_CODE_SRC, 'gs'), ''); }

// Find all regex matches in text, return array of {from, to, match, groups}
function findAll(src, text, flags) {
  const rex = new RegExp(src, flags);
  const results = [];
  let m;
  while ((m = rex.exec(text)) !== null) {
    results.push({ from: m.index, to: m.index + m[0].length, match: m[0], groups: m });
    if (!rex.global) break;
  }
  return results;
}

// ── Stopwords for n-gram ──────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of',
  'is','it','that','this','with','as','by','from','was','were','are',
  'be','been','has','have','had','not','no','do','does','did','will',
  'would','could','should','can','may','might','if','then','than','so',
  'up','out','about','into','over','after','before','between','through',
  'just','also','very','more','most','some','any','each','every','all',
  'both','few','other','such','only','own','same','too','how','what',
  'which','who','when','where','why',
]);

function findRepeatedNgrams(text) {
  const rawTokens = text.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.map(t => t.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase()).filter(Boolean);

  const minN = HP.repeated_ngram_min_n;
  const maxN = HP.repeated_ngram_max_n;
  if (tokens.length < minN) return [];

  const ngramCounts = new Map();
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      const gram = tokens.slice(i, i + n).join(' ');
      ngramCounts.set(gram, (ngramCounts.get(gram) || 0) + 1);
    }
  }

  const repeated = new Map();
  for (const [gram, count] of ngramCounts) {
    if (count >= HP.repeated_ngram_min_count) {
      const words = gram.split(' ');
      if (!words.every(w => STOPWORDS.has(w))) {
        repeated.set(gram, count);
      }
    }
  }

  if (repeated.size === 0) return [];

  // Suppress sub-ngrams
  const sorted = [...repeated.keys()].sort((a, b) => b.length - a.length);
  const toRemove = new Set();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const shorter = sorted[j];
      if (toRemove.has(shorter)) continue;
      if (sorted[i].includes(shorter) && repeated.get(sorted[i]) >= repeated.get(shorter)) {
        toRemove.add(shorter);
      }
    }
  }

  const results = [];
  for (const gram of sorted) {
    if (!toRemove.has(gram)) {
      results.push({ phrase: gram, count: repeated.get(gram), n: gram.split(' ').length });
    }
  }
  results.sort((a, b) => b.n - a.n || b.count - a.count);
  return results;
}

// ── Core analyze ──────────────────────────────────────────────────────────────

function analyze(text) {
  const wc = wordCount(text);
  const counts = {
    slop_words: 0, slop_phrases: 0, structural: 0, tone: 0,
    weasel: 0, ai_disclosure: 0, placeholder: 0, rhythm: 0,
    em_dash: 0, contrast_pairs: 0, colon_density: 0, pithy_fragment: 0,
    setup_resolution: 0, bullet_density: 0, blockquote_density: 0,
    bold_bullet_list: 0, horizontal_rules: 0, phrase_reuse: 0,
  };

  if (wc < HP.short_text_word_count) {
    return { score: 100, band: 'clean', word_count: wc, violations: [], counts, advice: [], warnings: [] };
  }

  const lines = text.split('\n');
  const sentences = text.split(re(SENTENCE_SPLIT_SRC, 'g')).map(s => s.trim()).filter(Boolean);
  const violations = [];  // {rule, match, from, to, penalty, advice}
  const advice = [];
  const warnings = [];    // document-level strings (no position)

  // ─ 1. Slop words ─
  for (const hit of findAll(SLOP_WORD_SRC, text, 'gi')) {
    const word = hit.match.toLowerCase();
    violations.push({ rule: 'slop_word', match: word, from: hit.from, to: hit.to, penalty: HP.slop_word_penalty, advice: `Replace '${word}' — what specifically do you mean?` });
    counts.slop_words++;
  }

  // ─ 2. Slop phrases ─
  for (const phrase of SLOP_PHRASES_LITERAL) {
    for (const hit of findAll(escRe(phrase), text, 'gi')) {
      const p = hit.match.toLowerCase();
      violations.push({ rule: 'slop_phrase', match: p, from: hit.from, to: hit.to, penalty: HP.slop_phrase_penalty, advice: `Cut '${p}' — just state the point directly.` });
      counts.slop_phrases++;
    }
  }
  for (const hit of findAll(NOT_JUST_BUT_SRC, text, 'gi')) {
    const p = hit.match.trim().toLowerCase();
    violations.push({ rule: 'slop_phrase', match: p, from: hit.from, to: hit.to, penalty: HP.slop_phrase_penalty, advice: `Cut '${p}' — just state the point directly.` });
    counts.slop_phrases++;
  }

  // ─ 3. Structural ─
  const boldMatches = findAll(BOLD_HEADER_SRC, text, 'g');
  if (boldMatches.length >= HP.structural_bold_header_min) {
    for (const hit of boldMatches) {
      violations.push({ rule: 'structural', match: 'bold_header', from: hit.from, to: hit.to, penalty: 0, advice: `Vary paragraph structure — bold-header-explanation block.` });
    }
    violations.push({ rule: 'structural', match: 'bold_header_explanation', from: -1, to: -1, penalty: HP.structural_bold_header_penalty, advice: `Vary paragraph structure — ${boldMatches.length} bold-header-explanation blocks reads as LLM listicle.` });
    advice.push(`Vary paragraph structure — ${boldMatches.length} bold-header-explanation blocks in a row reads as LLM listicle.`);
    counts.structural++;
  }

  // bullet runs
  {
    let run = 0;
    let runStart = -1;
    const bulletRe = re(BULLET_LINE_SRC, 'i');
    const lineOffsets = [];
    let off = 0;
    for (const line of lines) { lineOffsets.push(off); off += line.length + 1; }

    for (let i = 0; i < lines.length; i++) {
      if (bulletRe.test(lines[i])) {
        if (run === 0) runStart = i;
        run++;
      } else {
        if (run >= HP.structural_bullet_run_min) {
          const from = lineOffsets[runStart];
          const to = lineOffsets[runStart + run - 1] + lines[runStart + run - 1].length;
          violations.push({ rule: 'structural', match: 'excessive_bullets', from, to, penalty: HP.structural_bullet_run_penalty, advice: `Consider prose instead of this ${run}-item bullet list.` });
          advice.push(`Consider prose instead of this ${run}-item bullet list.`);
          counts.structural++;
        }
        run = 0; runStart = -1;
      }
    }
    if (run >= HP.structural_bullet_run_min) {
      const from = lineOffsets[runStart];
      const to = lineOffsets[runStart + run - 1] + lines[runStart + run - 1].length;
      violations.push({ rule: 'structural', match: 'excessive_bullets', from, to, penalty: HP.structural_bullet_run_penalty, advice: `Consider prose instead of this ${run}-item bullet list.` });
      advice.push(`Consider prose instead of this ${run}-item bullet list.`);
      counts.structural++;
    }
  }

  // triadic
  const triadicMatches = findAll(TRIADIC_SRC, text, 'gi');
  const triadicCount = triadicMatches.length;
  for (const hit of triadicMatches.slice(0, HP.triadic_record_cap)) {
    violations.push({ rule: 'structural', match: 'triadic', from: hit.from, to: hit.to, penalty: HP.triadic_penalty, advice: `'X, Y, and Z' triadic — vary your list cadence.` });
    counts.structural++;
  }
  if (triadicCount >= HP.triadic_advice_min) {
    advice.push(`${triadicCount} triadic structures ('X, Y, and Z') — vary your list cadence.`);
  }

  // ─ 4. Tone ─
  for (const src of META_COMM_SRCS) {
    for (const hit of findAll(src, text, 'gi')) {
      const p = hit.match.toLowerCase();
      violations.push({ rule: 'tone', match: p, from: hit.from, to: hit.to, penalty: HP.tone_penalty, advice: `Remove '${p}' — this is a direct AI tell.` });
      counts.tone++;
    }
  }
  for (const src of FALSE_NARR_SRCS) {
    for (const hit of findAll(src, text, 'gi')) {
      const p = hit.match.toLowerCase();
      violations.push({ rule: 'tone', match: p, from: hit.from, to: hit.to, penalty: HP.tone_penalty, advice: `Cut '${p}' — announce less, show more.` });
      counts.tone++;
    }
  }
  for (const src of SENTENCE_OPENER_SRCS) {
    for (const hit of findAll(src, text, 'gim')) {
      const word = (hit.groups[1] || '').trim().replace(/[,! ]+$/, '');
      violations.push({ rule: 'tone', match: word.toLowerCase(), from: hit.from, to: hit.to, penalty: HP.sentence_opener_penalty, advice: `'${word.toLowerCase()}' as a sentence opener is an AI tell — just make the point.` });
      counts.tone++;
    }
  }

  // ─ 4c. Weasel ─
  for (const src of WEASEL_SRCS) {
    for (const hit of findAll(src, text, 'gi')) {
      const p = hit.match.toLowerCase();
      violations.push({ rule: 'weasel', match: p, from: hit.from, to: hit.to, penalty: HP.weasel_penalty, advice: `Cut '${p}' — either cite a source or own the claim.` });
      counts.weasel++;
    }
  }

  // ─ 4d. AI disclosure ─
  for (const src of AI_DISCLOSURE_SRCS) {
    for (const hit of findAll(src, text, 'gi')) {
      const p = hit.match.toLowerCase();
      violations.push({ rule: 'ai_disclosure', match: p, from: hit.from, to: hit.to, penalty: HP.ai_disclosure_penalty, advice: `Remove '${p}' — AI self-disclosure in authored prose is a critical tell.` });
      counts.ai_disclosure++;
    }
  }

  // ─ 4e. Placeholder ─
  for (const hit of findAll(PLACEHOLDER_SRC, text, 'gi')) {
    const p = hit.match.toLowerCase();
    violations.push({ rule: 'placeholder', match: p, from: hit.from, to: hit.to, penalty: HP.placeholder_penalty, advice: `Remove placeholder '${p}' — this is unfinished template text.` });
    counts.placeholder++;
  }

  // ─ 5. Rhythm (document-level) ─
  if (sentences.length >= HP.rhythm_min_sentences) {
    const lengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    if (mean > 0) {
      const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
      const std = Math.sqrt(variance);
      const cv = std / mean;
      if (cv < HP.rhythm_cv_threshold) {
        warnings.push(`Rhythm too uniform (CV=${cv.toFixed(2)}, ${sentences.length} sentences) — vary short and long.`);
        counts.rhythm++;
      }
    }
  }

  // ─ 6. Em dash ─
  {
    const emMatches = findAll(EM_DASH_SRC, text, 'g');
    const emCount = emMatches.length;
    if (wc > 0) {
      const ratioPer150 = (emCount / wc) * HP.em_dash_words_basis;
      if (ratioPer150 > HP.em_dash_density_threshold) {
        for (const hit of emMatches) {
          violations.push({ rule: 'em_dash', match: hit.match, from: hit.from, to: hit.to, penalty: 0, advice: `Em dash density too high — use other punctuation.` });
        }
        violations.push({ rule: 'em_dash', match: 'em_dash_density', from: -1, to: -1, penalty: HP.em_dash_penalty, advice: `Too many em dashes (${emCount} in ${wc} words) — use other punctuation.` });
        warnings.push(`Too many em dashes (${emCount} in ${wc} words, ${((emCount/wc)*150).toFixed(1)} per 150 words).`);
        counts.em_dash++;
      }
    }
  }

  // ─ 7. Contrast pair ─
  {
    const contrastMatches = findAll(CONTRAST_PAIR_SRC, text, 'gi');
    const contrastCount = contrastMatches.length;
    for (const hit of contrastMatches.slice(0, HP.contrast_record_cap)) {
      const m = hit.match;
      violations.push({ rule: 'contrast_pair', match: m, from: hit.from, to: hit.to, penalty: HP.contrast_penalty, advice: `'${m}' — 'X, not Y' contrast — consider rephrasing to avoid the Claude pattern.` });
      counts.contrast_pairs++;
    }
    if (contrastCount >= HP.contrast_advice_min) {
      advice.push(`${contrastCount} 'X, not Y' contrasts — this is a Claude rhetorical tic. Vary your phrasing.`);
    }
  }

  // ─ 7b. Setup-resolution ─
  {
    let recorded = 0;
    for (const src of [SETUP_RES_A_SRC, SETUP_RES_B_SRC]) {
      for (const hit of findAll(src, text, 'gi')) {
        if (recorded < HP.setup_resolution_record_cap) {
          violations.push({ rule: 'setup_resolution', match: hit.match, from: hit.from, to: hit.to, penalty: HP.setup_resolution_penalty, advice: `'${hit.match.slice(0,40)}…' — setup-and-resolution is a Claude rhetorical tic.` });
          recorded++;
        }
        counts.setup_resolution++;
      }
    }
  }

  // ─ 8. Colon density (document-level) ─
  {
    const strippedText = stripCodeBlocks(text);
    let colonCount = 0;
    for (const line of strippedText.split('\n')) {
      if (/^\s*#/.test(line)) continue;
      let cm;
      const cRe = /: [a-z]/g;
      while ((cm = cRe.exec(line)) !== null) {
        const before = line.slice(0, cm.index + 1);
        if (before.endsWith('http:') || before.endsWith('https:')) continue;
        const snippet = line.slice(cm.index, cm.index + 10);
        if (/: ["{\[\d]|: true|: false|: null/.test(snippet)) continue;
        colonCount++;
      }
    }
    const swc = wordCount(strippedText);
    if (swc > 0) {
      const ratio = (colonCount / swc) * HP.colon_words_basis;
      if (ratio > HP.colon_density_threshold) {
        warnings.push(`Too many elaboration colons (${colonCount} in ${swc} words, ${ratio.toFixed(1)} per 150 words) — use periods or restructure.`);
        counts.colon_density++;
      }
    }
  }

  // ─ 9. Pithy fragment ─
  {
    const pivotRe = re(PITHY_PIVOT_SRC, 'i');
    let pithyCount = 0;
    for (const sent of sentences) {
      const stripped = sent.trim();
      if (!stripped) continue;
      const sentWords = stripped.split(/\s+/).filter(Boolean);
      if (sentWords.length > HP.pithy_max_sentence_words) continue;
      if (pivotRe.test(stripped)) {
        if (pithyCount < HP.pithy_record_cap) {
          const idx = text.indexOf(stripped);
          if (idx >= 0) {
            violations.push({ rule: 'pithy_fragment', match: stripped, from: idx, to: idx + stripped.length, penalty: HP.pithy_penalty, advice: `'${stripped}' — pithy evaluative fragments are a Claude tell. Expand or cut.` });
          } else {
            violations.push({ rule: 'pithy_fragment', match: stripped, from: -1, to: -1, penalty: HP.pithy_penalty, advice: `'${stripped}' — pithy evaluative fragments are a Claude tell. Expand or cut.` });
          }
          pithyCount++;
        }
        counts.pithy_fragment++;
      }
    }
  }

  // ─ 12. Bullet density ─
  {
    const nonEmpty = lines.filter(l => l.trim());
    const bulletDensRe = re(BULLET_DENSITY_SRC, 'i');
    const bulletCount = nonEmpty.filter(l => bulletDensRe.test(l)).length;
    if (nonEmpty.length > 0) {
      const ratio = bulletCount / nonEmpty.length;
      if (ratio > HP.bullet_density_threshold) {
        warnings.push(`Over ${Math.round(ratio*100)}% of lines are bullets — write prose instead of lists.`);
        counts.bullet_density++;
      }
    }
  }

  // ─ 13. Blockquote density ─
  {
    let inCode = false;
    let bqCount = 0;
    for (const line of lines) {
      if (line.trim().startsWith('```')) { inCode = !inCode; continue; }
      if (!inCode && line.startsWith('>')) bqCount++;
    }
    if (bqCount >= HP.blockquote_min_lines) {
      warnings.push(`${bqCount} blockquotes — integrate key claims into prose instead of pulling them out as blockquotes.`);
      counts.blockquote_density++;
    }
  }

  // ─ 14. Bold-term bullet runs ─
  {
    const bbRe = re(BOLD_TERM_BULLET_SRC, 'i');
    const lineOffsets = [];
    let off2 = 0;
    for (const line of lines) { lineOffsets.push(off2); off2 += line.length + 1; }

    let bbRun = 0;
    let bbStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (bbRe.test(lines[i])) {
        if (bbRun === 0) bbStart = i;
        bbRun++;
      } else {
        if (bbRun >= HP.bold_bullet_run_min) {
          const from = lineOffsets[bbStart];
          const to = lineOffsets[bbStart + bbRun - 1] + lines[bbStart + bbRun - 1].length;
          violations.push({ rule: 'structural', match: 'bold_bullet_list', from, to, penalty: HP.bold_bullet_run_penalty, advice: `Run of ${bbRun} bold-term bullets — this is an LLM listicle pattern. Use varied paragraph structure.` });
          advice.push(`Run of ${bbRun} bold-term bullets — LLM listicle pattern.`);
          counts.bold_bullet_list++;
        }
        bbRun = 0; bbStart = -1;
      }
    }
    if (bbRun >= HP.bold_bullet_run_min) {
      const from = lineOffsets[bbStart];
      const to = lineOffsets[bbStart + bbRun - 1] + lines[bbStart + bbRun - 1].length;
      violations.push({ rule: 'structural', match: 'bold_bullet_list', from, to, penalty: HP.bold_bullet_run_penalty, advice: `Run of ${bbRun} bold-term bullets — LLM listicle pattern.` });
      advice.push(`Run of ${bbRun} bold-term bullets — LLM listicle pattern.`);
      counts.bold_bullet_list++;
    }
  }

  // ─ 15. Horizontal rules ─
  {
    const hrMatches = findAll(HORIZONTAL_RULE_SRC, text, 'gm');
    if (hrMatches.length >= HP.horizontal_rule_min) {
      warnings.push(`${hrMatches.length} horizontal rules — section headers alone are sufficient, dividers are a crutch.`);
      counts.horizontal_rules++;
    }
  }

  // ─ 16. Phrase reuse ─
  {
    const ngrams = findRepeatedNgrams(text);
    let prRecorded = 0;
    for (const ng of ngrams) {
      if (prRecorded >= HP.phrase_reuse_record_cap) break;
      const phrase = ng.phrase;
      const count = ng.count;
      const phraseSrc = phrase.split(' ').map(escRe).join('\\s+');
      for (const hit of findAll(phraseSrc, text, 'gi')) {
        violations.push({ rule: 'phrase_reuse', match: phrase, from: hit.from, to: hit.to, penalty: 0, advice: `'${phrase}' appears ${count} times — vary your phrasing.` });
      }
      violations.push({ rule: 'phrase_reuse', match: phrase, from: -1, to: -1, penalty: HP.phrase_reuse_penalty, advice: `'${phrase}' appears ${count} times — vary your phrasing to avoid repetition.` });
      advice.push(`'${phrase}' appears ${count} times — vary your phrasing to avoid repetition.`);
      counts.phrase_reuse++;
      prRecorded++;
    }
  }

  // ── Scoring ──────────────────────────────────────────────────────────────────
  let weightedSum = 0;
  for (const v of violations) {
    const penalty = Math.abs(v.penalty);
    if (penalty === 0) continue;
    const rule = v.rule;
    let countKey = null;
    if (HP.claude_categories.has(rule)) countKey = rule;
    else if (HP.claude_categories.has(rule + 's')) countKey = rule + 's';

    const catCount = counts[countKey] || counts[rule] || 0;
    let weight;
    if (countKey && HP.claude_categories.has(countKey) && catCount > 1) {
      weight = penalty * (1 + HP.concentration_alpha * (catCount - 1));
    } else {
      weight = penalty;
    }
    weightedSum += weight;
  }

  const density = wc > 0 ? weightedSum / (wc / HP.density_words_basis) : 0;
  const rawScore = HP.score_max * Math.exp(-HP.decay_lambda * density);
  const score = Math.max(HP.score_min, Math.min(HP.score_max, Math.round(rawScore)));

  function bandFor(s) {
    if (s >= HP.band_clean_min) return 'clean';
    if (s >= HP.band_light_min) return 'light';
    if (s >= HP.band_moderate_min) return 'moderate';
    if (s >= HP.band_heavy_min) return 'heavy';
    return 'saturated';
  }

  // Deduplicate advice
  const seenAdv = new Set();
  const uniqueAdvice = [];
  for (const v of violations) {
    if (v.advice && !seenAdv.has(v.advice)) { seenAdv.add(v.advice); uniqueAdvice.push(v.advice); }
  }
  for (const a of advice) {
    if (!seenAdv.has(a)) { seenAdv.add(a); uniqueAdvice.push(a); }
  }

  return { score, band: bandFor(score), word_count: wc, violations, counts, advice: uniqueAdvice, warnings };
}

// ══════════════════════════════════════════════════════════════════════════════
//  UI
// ══════════════════════════════════════════════════════════════════════════════

// Category display config
const CATEGORIES = [
  { key: 'slop_words',        label: 'Slop words',         rule: 'slop_word',        color: '#fef08a' },
  { key: 'slop_phrases',      label: 'Slop phrases',       rule: 'slop_phrase',      color: '#fed7aa' },
  { key: 'tone',              label: 'Tone / AI tells',    rule: 'tone',             color: '#bfdbfe' },
  { key: 'ai_disclosure',     label: 'AI disclosure',      rule: 'ai_disclosure',    color: '#fca5a5' },
  { key: 'structural',        label: 'Structure',          rule: 'structural',       color: '#ddd6fe' },
  { key: 'weasel',            label: 'Weasel phrases',     rule: 'weasel',           color: '#f9a8d4' },
  { key: 'contrast_pairs',    label: 'Contrast pairs',     rule: 'contrast_pair',    color: '#a7f3d0' },
  { key: 'setup_resolution',  label: 'Setup-resolution',   rule: 'setup_resolution', color: '#99f6e4' },
  { key: 'pithy_fragment',    label: 'Pithy fragments',    rule: 'pithy_fragment',   color: '#bbf7d0' },
  { key: 'em_dash',           label: 'Em dash density',    rule: 'em_dash',          color: '#bae6fd' },
  { key: 'phrase_reuse',      label: 'Phrase reuse',       rule: 'phrase_reuse',     color: '#fde68a' },
  { key: 'placeholder',       label: 'Placeholders',       rule: 'placeholder',      color: '#e5e7eb' },
];

// Build category rows once
const catRowsEl = document.getElementById('cat-rows');
const catCountEls = {};
for (const cat of CATEGORIES) {
  const row = document.createElement('div');
  row.className = 'cat-row';
  row.innerHTML = `<span class="cat-swatch" style="background:${cat.color}"></span>
    <span class="cat-name">${cat.label}</span>
    <span class="cat-count" id="cc-${cat.key}">0</span>`;
  catRowsEl.appendChild(row);
  catCountEls[cat.key] = document.getElementById(`cc-${cat.key}`);
}

// ── CodeMirror init ───────────────────────────────────────────────────────────
const editorTextarea = document.getElementById('editor');
const editor = CodeMirror.fromTextArea(editorTextarea, {
  mode: 'markdown',
  keyMap: 'default',
  lineWrapping: true,
  theme: 'default',
  extraKeys: { 'Tab': false },
});

// ── Highlight marks ──────────────────────────────────────────────────────────
let marks = [];
function applyHighlights(violations) {
  marks.forEach(m => m.clear());
  marks = [];
  for (const v of violations) {
    if (v.from < 0 || v.to < 0 || v.from >= v.to) continue;
    const cls = 'sg-' + v.rule.replace(/_/g, '-');
    try {
      const from = editor.posFromIndex(v.from);
      const to = editor.posFromIndex(v.to);
      const mark = editor.markText(from, to, {
        className: cls,
        title: v.advice || v.rule,
        inclusiveLeft: false,
        inclusiveRight: false,
      });
      marks.push(mark);
    } catch(e) { /* ignore out-of-range */ }
  }
}

// ── Sidebar update ────────────────────────────────────────────────────────────
const scoreNumEl   = document.getElementById('score-num');
const scoreBandEl  = document.getElementById('score-band');
const scoreWordsEl = document.getElementById('score-words');
const warnListEl   = document.getElementById('warn-list');
const adviceListEl = document.getElementById('advice-list');

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateSidebar(result) {
  // score
  const bandClass = 'band-' + result.band;
  scoreNumEl.textContent = result.score;
  scoreNumEl.className = bandClass;
  scoreBandEl.textContent = result.band;
  scoreBandEl.className = bandClass;
  scoreWordsEl.textContent = result.word_count === 1 ? '1 word' : `${result.word_count} words`;

  // counts
  for (const cat of CATEGORIES) {
    const el = catCountEls[cat.key];
    const n = result.counts[cat.key] || 0;
    el.textContent = n;
    el.className = n > 0 ? 'cat-count nonzero' : 'cat-count';
  }

  // warnings
  if (result.warnings && result.warnings.length > 0) {
    warnListEl.innerHTML = result.warnings.map(w => `<div class="warn-item">&#x26A0; ${escHtml(w)}</div>`).join('');
  } else {
    warnListEl.innerHTML = '<span class="empty-msg">none detected</span>';
  }

  // advice — build map from advice string → first violation position with that advice
  const adviceToPos = new Map();
  for (const v of result.violations) {
    if (v.advice && v.from >= 0 && !adviceToPos.has(v.advice)) {
      adviceToPos.set(v.advice, v.from);
    }
  }
  if (result.advice && result.advice.length > 0) {
    const sorted = [...result.advice].sort((a, b) => {
      const pa = adviceToPos.has(a) ? adviceToPos.get(a) : Infinity;
      const pb = adviceToPos.has(b) ? adviceToPos.get(b) : Infinity;
      return pa - pb;
    });
    adviceListEl.innerHTML = sorted.slice(0, 30).map(a => {
      const pos = adviceToPos.get(a);
      const attr = pos !== undefined ? ` data-from="${pos}" title="Click to jump to this in the editor"` : '';
      return `<li${attr}>${escHtml(a)}</li>`;
    }).join('');
  } else {
    adviceListEl.innerHTML = result.word_count < HP.short_text_word_count
      ? '<li class="empty-msg">keep typing…</li>'
      : '<li class="empty-msg">Looking clean!</li>';
  }
}

// ── Advice click → scroll editor to violation ─────────────────────────────────
let flashTimer = null;
adviceListEl.addEventListener('click', e => {
  const li = e.target.closest('li[data-from]');
  if (!li) return;
  const from = parseInt(li.dataset.from, 10);
  const pos = editor.posFromIndex(from);
  editor.scrollIntoView(pos, 120);
  editor.setCursor(pos);
  editor.focus();

  // flash the line so the user can spot it
  clearTimeout(flashTimer);
  const lineHandle = editor.getLineHandle(pos.line);
  editor.addLineClass(lineHandle, 'background', 'sg-flash-line');
  flashTimer = setTimeout(() => {
    editor.removeLineClass(lineHandle, 'background', 'sg-flash-line');
  }, 700);
});

// ── Debounce + re-analyze ─────────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const runAnalysis = debounce(() => {
  const text = editor.getValue();
  const result = analyze(text);
  applyHighlights(result.violations);
  updateSidebar(result);
}, 300);

editor.on('change', runAnalysis);

// Run once with placeholder content
const SAMPLE_TEXT = `In today's fast-paced landscape, it's important to note that AI-generated content is reshaping the tapestry of communication. As technology continues to evolve, we must holistically embrace these groundbreaking changes. Moreover, the journey toward comprehensive understanding is crucial.

Let's break this down: the pivotal question isn't just about quantity, but quality. This isn't a simple problem. It's a multifaceted challenge that requires meticulous attention.

As an AI, I can leverage my capabilities to underscore the innovative nature of this paradigm shift. Notably, experts suggest that studies show these remarkable findings.

Would you like me to delve deeper into this fascinating spectrum of ideas? Let me know if this helps!`;

editor.setValue(SAMPLE_TEXT);

// ── Vim toggle ────────────────────────────────────────────────────────────────
let vimEnabled = false;
const vimBtn = document.getElementById('vim-btn');
vimBtn.onclick = () => {
  vimEnabled = !vimEnabled;
  editor.setOption('keyMap', vimEnabled ? 'vim' : 'default');
  vimBtn.textContent = vimEnabled ? 'Vim: ON' : 'Vim: OFF';
  vimBtn.classList.toggle('active', vimEnabled);
  editor.focus();
};

// ── Dark mode toggle ──────────────────────────────────────────────────────────
let darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
const themeBtn = document.getElementById('theme-btn');

function applyTheme() {
  document.body.classList.toggle('dark', darkMode);
  themeBtn.textContent = darkMode ? '\u263D Dark' : '\u2600 Light';
  editor.refresh();
}

themeBtn.onclick = () => { darkMode = !darkMode; applyTheme(); };

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  darkMode = e.matches;
  applyTheme();
});

// Apply initial theme and run analysis
applyTheme();
runAnalysis();
