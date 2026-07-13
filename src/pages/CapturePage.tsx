import React, { useState, useCallback } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import {
  generateUUID,
  type CaptureType,
  type BusinessCapture,
  type Activity,
  type WishlistItem,
  type MoodTag,
  type TimeEstimate,
  type EnergyLevel,
  type CostBand,
  type MaterialsReady,
} from '../types';
import { parseEuroToCents } from '../lib/wishlist';
import { Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';

type CaptureChoice = CaptureType | 'wishlist';

const CAPTURE_TYPES: { type: CaptureChoice; label: string }[] = [
  { type: 'business', label: 'Business idea' },
  { type: 'wishlist', label: 'Wishlist' },
  { type: 'hobby', label: 'Hobby' },
  { type: 'diy', label: 'DIY project' },
  { type: 'ai-project', label: 'AI project' },
  { type: 'learning', label: 'Learning' },
  { type: 'other', label: 'Other' },
];

const MOOD_TAGS: { value: MoodTag; label: string }[] = [
  { value: 'create', label: 'Create' },
  { value: 'learn', label: 'Learn' },
  { value: 'build_fix', label: 'Build/Fix' },
  { value: 'relax', label: 'Relax' },
  { value: 'active', label: 'Active' },
];

const TIME_ESTIMATES: { value: TimeEstimate; label: string }[] = [
  { value: '10m', label: '10 min' },
  { value: '30m', label: '30 min' },
  { value: '1-2h', label: '1–2 hr' },
  { value: 'few_hours', label: 'Few hours' },
  { value: 'surprise', label: 'Surprise me' },
];

const ENERGY_LEVELS: { value: EnergyLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'surprise', label: 'Surprise me' },
];

const COST_BANDS: { value: CostBand; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'under_10', label: '< €10' },
  { value: 'under_50', label: '< €50' },
  { value: 'under_100', label: '< €100' },
  { value: 'over_100', label: '€100+' },
  { value: 'unknown', label: 'Unknown' },
];

const MATERIALS_READY_OPTIONS: { value: MaterialsReady; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'n/a', label: 'N/A' },
];

function parseTags(tagString: string): string[] {
  return tagString
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function handleRadioKeyDown<T extends string>(
  event: React.KeyboardEvent<HTMLButtonElement>,
  values: T[],
  current: T | '',
  onSelect: (value: T) => void
) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();

  const currentIndex = Math.max(0, values.indexOf(current as T));
  let nextIndex = currentIndex;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + values.length) % values.length;
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % values.length;
  }
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = values.length - 1;

  onSelect(values[nextIndex]);
  const group = event.currentTarget.closest('[role="radiogroup"]');
  window.requestAnimationFrame(() => {
    group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  });
}

export const CapturePage: React.FC = () => {
  const { saveCapture, saveAct, saveWish, getNextId } = useAppData();
  const { showToast } = useToast();

  // Core fields
  const [rawThought, setRawThought] = useState('');
  const [captureType, setCaptureType] = useState<CaptureChoice>('business');
  const [expanded, setExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Business fields
  const [workingTitle, setWorkingTitle] = useState('');
  const [category, setCategory] = useState('');
  const [likelyCustomer, setLikelyCustomer] = useState('');
  const [possibleProblem, setPossibleProblem] = useState('');
  const [whyMightPay, setWhyMightPay] = useState('');
  const [geography, setGeography] = useState('');
  const [assumptions, setAssumptions] = useState('');
  const [evidence, setEvidence] = useState('');
  const [questions, setQuestions] = useState('');
  const [bizTags, setBizTags] = useState('');

  // Activity fields
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [actTags, setActTags] = useState('');
  const [moodTags, setMoodTags] = useState<MoodTag[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<TimeEstimate | ''>('');
  const [energy, setEnergy] = useState<EnergyLevel | ''>('');
  const [location, setLocation] = useState('');
  const [costBand, setCostBand] = useState<CostBand | ''>('');
  const [materialsNeeded, setMaterialsNeeded] = useState('');
  const [materialsReady, setMaterialsReady] = useState<MaterialsReady | ''>('');
  const [smallestStep, setSmallestStep] = useState('');
  const [fiveMinuteVersion, setFiveMinuteVersion] = useState('');

  // Wishlist fields
  const [wishTargetPrice, setWishTargetPrice] = useState('');
  const [wishSavedAmount, setWishSavedAmount] = useState('');
  const [wishProductUrl, setWishProductUrl] = useState('');
  const [wishNotes, setWishNotes] = useState('');

  const isBusiness = captureType === 'business';
  const isWishlist = captureType === 'wishlist';
  const capturePrompt = isWishlist ? 'What would you like to buy?' : "What's on your mind?";

  const resetForm = useCallback(() => {
    setRawThought('');
    setCaptureType('business');
    setExpanded(false);
    setWorkingTitle('');
    setCategory('');
    setLikelyCustomer('');
    setPossibleProblem('');
    setWhyMightPay('');
    setGeography('');
    setAssumptions('');
    setEvidence('');
    setQuestions('');
    setBizTags('');
    setTitle('');
    setNotes('');
    setActTags('');
    setMoodTags([]);
    setEstimatedTime('');
    setEnergy('');
    setLocation('');
    setCostBand('');
    setMaterialsNeeded('');
    setMaterialsReady('');
    setSmallestStep('');
    setFiveMinuteVersion('');
    setWishTargetPrice('');
    setWishSavedAmount('');
    setWishProductUrl('');
    setWishNotes('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!rawThought.trim()) {
      showToast('Please enter your thought first', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      if (captureType === 'business') {
        const localId = await getNextId();
        const capture: BusinessCapture = {
          id: generateUUID(),
          localId,
          type: 'business',
          rawWording: rawThought,
          workingTitle: workingTitle.trim() || undefined,
          category: category.trim() || undefined,
          likelyCustomer: likelyCustomer.trim() || undefined,
          possibleProblem: possibleProblem.trim() || undefined,
          whyMightPay: whyMightPay.trim() || undefined,
          geography: geography.trim() || undefined,
          assumptions: assumptions.trim() || undefined,
          evidence: evidence.trim() || undefined,
          questions: questions.trim() || undefined,
          tags: parseTags(bizTags),
          capturedAt: now,
          updatedAt: now,
          handoffState: 'unprocessed',
        };
        await saveCapture(capture);
        showToast('Business idea saved', 'success');
      } else if (captureType === 'wishlist') {
        const targetPriceCents = parseEuroToCents(wishTargetPrice);
        const savedAmountCents = parseEuroToCents(wishSavedAmount);
        const productUrl = wishProductUrl.trim();

        if (targetPriceCents === null || targetPriceCents === 0 || savedAmountCents === null) {
          showToast('Enter a valid target price and saved amount.', 'error');
          return;
        }
        if (productUrl && !isHttpUrl(productUrl)) {
          showToast('Enter a product link starting with http:// or https://.', 'error');
          return;
        }

        const wishlistItem: WishlistItem = {
          id: generateUUID(),
          type: 'wishlist',
          title: rawThought.trim(),
          notes: wishNotes.trim() || undefined,
          productUrl: productUrl || undefined,
          targetPriceCents,
          savedAmountCents: savedAmountCents ?? 0,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };
        await saveWish(wishlistItem);
        showToast('Wishlist item saved', 'success');
      } else {
        const activity: Activity = {
          id: generateUUID(),
          type: captureType,
          title: title.trim() || rawThought.trim().slice(0, 100),
          notes: notes.trim() || undefined,
          tags: parseTags(actTags),
          moodTags,
          estimatedTime: estimatedTime || undefined,
          energy: energy || undefined,
          location: location.trim() || undefined,
          costBand: costBand || undefined,
          materialsNeeded: materialsNeeded.trim() || undefined,
          materialsReady: materialsReady || undefined,
          smallestStep: smallestStep.trim() || undefined,
          fiveMinuteVersion: fiveMinuteVersion.trim() || undefined,
          status: 'available',
          pickCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        await saveAct(activity);
        showToast('Activity saved', 'success');
      }

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      resetForm();
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [
    rawThought,
    captureType,
    getNextId,
    workingTitle,
    category,
    likelyCustomer,
    possibleProblem,
    whyMightPay,
    geography,
    assumptions,
    evidence,
    questions,
    bizTags,
    title,
    notes,
    actTags,
    moodTags,
    estimatedTime,
    energy,
    location,
    costBand,
    materialsNeeded,
    materialsReady,
    smallestStep,
    fiveMinuteVersion,
    wishTargetPrice,
    wishSavedAmount,
    wishProductUrl,
    wishNotes,
    saveCapture,
    saveAct,
    saveWish,
    showToast,
    resetForm,
  ]);

  const toggleMoodTag = (tag: MoodTag) => {
    setMoodTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 24 }}>
        Capture
      </h1>

      <div className="card">
        {/* Raw thought textarea */}
        <div className="form-group">
          <label htmlFor="raw-thought" className="sr-only">
            {capturePrompt}
          </label>
          <textarea
            id="raw-thought"
            value={rawThought}
            onChange={(e) => setRawThought(e.target.value)}
            placeholder={capturePrompt}
            aria-label={capturePrompt}
            rows={4}
            style={{
              fontSize: '1.25rem',
              minHeight: 140,
              borderRadius: 'var(--radius-lg)',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Type selector */}
        <div className="form-group">
          <div className="field-label" id="capture-type-label">Type</div>
          <div
            className="filter-bar"
            role="radiogroup"
            aria-labelledby="capture-type-label"
          >
            {CAPTURE_TYPES.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={captureType === type}
                aria-label={label}
                tabIndex={captureType === type ? 0 : -1}
                className={`chip ${captureType === type ? 'active' : ''}`}
                onClick={() => setCaptureType(type)}
                onKeyDown={(event) => handleRadioKeyDown(
                  event,
                  CAPTURE_TYPES.map((option) => option.type),
                  captureType,
                  setCaptureType
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Save quickly */}
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleSave}
          disabled={isSaving || !rawThought.trim()}
          aria-label="Save quickly"
          style={{ marginTop: 8 }}
        >
          {justSaved ? <Check size={18} /> : <Sparkles size={18} />}
          {isSaving ? 'Saving…' : justSaved ? 'Saved!' : 'Save quickly'}
        </button>

        {/* Expand / collapse details */}
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide additional details' : 'Add details'}
          style={{ marginTop: 8 }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {expanded ? 'Hide details' : 'Add details'}
        </button>

        {/* Expanded optional fields */}
        {expanded && (
          <div
            style={{
              marginTop: 16,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
            }}
          >
            {isBusiness ? (
              <>
                <div className="form-group">
                  <label htmlFor="working-title">Working title</label>
                  <input
                    id="working-title"
                    type="text"
                    value={workingTitle}
                    onChange={(e) => setWorkingTitle(e.target.value)}
                    placeholder="Give it a working title"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <input
                    id="category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. SaaS, Service, Physical product"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="likely-customer">
                    Likely customer{' '}
                    <span
                      style={{
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 400,
                      }}
                    >
                      (preliminary hypothesis)
                    </span>
                  </label>
                  <input
                    id="likely-customer"
                    type="text"
                    value={likelyCustomer}
                    onChange={(e) => setLikelyCustomer(e.target.value)}
                    placeholder="Who might need this?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="possible-problem">
                    Possible problem{' '}
                    <span
                      style={{
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 400,
                      }}
                    >
                      (preliminary hypothesis)
                    </span>
                  </label>
                  <input
                    id="possible-problem"
                    type="text"
                    value={possibleProblem}
                    onChange={(e) => setPossibleProblem(e.target.value)}
                    placeholder="What problem does this solve?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="why-might-pay">
                    Why someone might pay{' '}
                    <span
                      style={{
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 400,
                      }}
                    >
                      (preliminary hypothesis)
                    </span>
                  </label>
                  <input
                    id="why-might-pay"
                    type="text"
                    value={whyMightPay}
                    onChange={(e) => setWhyMightPay(e.target.value)}
                    placeholder="What value would they pay for?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="geography">Geography</label>
                  <input
                    id="geography"
                    type="text"
                    value={geography}
                    onChange={(e) => setGeography(e.target.value)}
                    placeholder="Local, regional, global…"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="assumptions">Assumptions</label>
                  <textarea
                    id="assumptions"
                    value={assumptions}
                    onChange={(e) => setAssumptions(e.target.value)}
                    placeholder="What are you assuming?"
                    rows={3}
                    style={{ minHeight: 80 }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="evidence">Evidence or source links</label>
                  <textarea
                    id="evidence"
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Any evidence, links, or sources?"
                    rows={3}
                    style={{ minHeight: 80 }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="questions">Questions to investigate</label>
                  <textarea
                    id="questions"
                    value={questions}
                    onChange={(e) => setQuestions(e.target.value)}
                    placeholder="What do you need to find out?"
                    rows={3}
                    style={{ minHeight: 80 }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="biz-tags">Tags</label>
                  <input
                    id="biz-tags"
                    type="text"
                    value={bizTags}
                    onChange={(e) => setBizTags(e.target.value)}
                    placeholder="Comma-separated tags"
                  />
                </div>
              </>
            ) : isWishlist ? (
              <>
                <p
                  style={{
                    marginBottom: 16,
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                  }}
                >
                  All fields are optional. Add a price when you are ready to track savings.
                </p>

                <div className="form-group">
                  <label htmlFor="wish-target-price">Target price (€)</label>
                  <input
                    id="wish-target-price"
                    type="text"
                    inputMode="decimal"
                    value={wishTargetPrice}
                    onChange={(event) => setWishTargetPrice(event.target.value)}
                    placeholder="e.g. 300"
                    aria-describedby="wish-price-help"
                  />
                  <span id="wish-price-help" className="wishlist-field-help">
                    Leave blank if you do not know the price yet.
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="wish-saved-amount">Saved so far (€)</label>
                  <input
                    id="wish-saved-amount"
                    type="text"
                    inputMode="decimal"
                    value={wishSavedAmount}
                    onChange={(event) => setWishSavedAmount(event.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="wish-product-url">Product link</label>
                  <input
                    id="wish-product-url"
                    type="url"
                    inputMode="url"
                    value={wishProductUrl}
                    onChange={(event) => setWishProductUrl(event.target.value)}
                    placeholder="https://…"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="wish-notes">Notes</label>
                  <textarea
                    id="wish-notes"
                    value={wishNotes}
                    onChange={(event) => setWishNotes(event.target.value)}
                    placeholder="Size, model, shop, or anything you want to remember"
                    rows={3}
                    style={{ minHeight: 80 }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="act-title">Title</label>
                  <input
                    id="act-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give it a title"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="act-notes">Notes</label>
                  <textarea
                    id="act-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any notes or details?"
                    rows={3}
                    style={{ minHeight: 80 }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="act-tags">Tags</label>
                  <input
                    id="act-tags"
                    type="text"
                    value={actTags}
                    onChange={(e) => setActTags(e.target.value)}
                    placeholder="Comma-separated tags"
                  />
                </div>

                <div className="form-group">
                  <div className="field-label" id="capture-mood-label">Mood</div>
                  <div
                    className="filter-bar"
                    role="group"
                    aria-labelledby="capture-mood-label"
                  >
                    {MOOD_TAGS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        className={`chip ${moodTags.includes(value) ? 'active' : ''}`}
                        onClick={() => toggleMoodTag(value)}
                        aria-pressed={moodTags.includes(value)}
                        aria-label={label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <div className="field-label" id="capture-time-label">Estimated time</div>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-labelledby="capture-time-label"
                  >
                    {TIME_ESTIMATES.map(({ value, label }, index) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={estimatedTime === value}
                        tabIndex={estimatedTime === value || (!estimatedTime && index === 0) ? 0 : -1}
                        className={`chip ${estimatedTime === value ? 'active' : ''}`}
                        onClick={() => setEstimatedTime(value)}
                        onKeyDown={(event) => handleRadioKeyDown(
                          event,
                          TIME_ESTIMATES.map((option) => option.value),
                          estimatedTime,
                          setEstimatedTime
                        )}
                        aria-label={label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <div className="field-label" id="capture-energy-label">Energy</div>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-labelledby="capture-energy-label"
                  >
                    {ENERGY_LEVELS.map(({ value, label }, index) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={energy === value}
                        tabIndex={energy === value || (!energy && index === 0) ? 0 : -1}
                        className={`chip ${energy === value ? 'active' : ''}`}
                        onClick={() => setEnergy(value)}
                        onKeyDown={(event) => handleRadioKeyDown(
                          event,
                          ENERGY_LEVELS.map((option) => option.value),
                          energy,
                          setEnergy
                        )}
                        aria-label={label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="act-location">Location</label>
                  <input
                    id="act-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where can you do this?"
                  />
                </div>

                <div className="form-group">
                  <div className="field-label" id="capture-cost-label">Cost band</div>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-labelledby="capture-cost-label"
                  >
                    {COST_BANDS.map(({ value, label }, index) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={costBand === value}
                        tabIndex={costBand === value || (!costBand && index === 0) ? 0 : -1}
                        className={`chip ${costBand === value ? 'active' : ''}`}
                        onClick={() => setCostBand(value)}
                        onKeyDown={(event) => handleRadioKeyDown(
                          event,
                          COST_BANDS.map((option) => option.value),
                          costBand,
                          setCostBand
                        )}
                        aria-label={label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="materials-needed">Materials needed</label>
                  <input
                    id="materials-needed"
                    type="text"
                    value={materialsNeeded}
                    onChange={(e) => setMaterialsNeeded(e.target.value)}
                    placeholder="What do you need?"
                  />
                </div>

                <div className="form-group">
                  <div className="field-label" id="capture-materials-label">Materials ready</div>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-labelledby="capture-materials-label"
                  >
                    {MATERIALS_READY_OPTIONS.map(({ value, label }, index) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={materialsReady === value}
                        tabIndex={materialsReady === value || (!materialsReady && index === 0) ? 0 : -1}
                        className={`chip ${materialsReady === value ? 'active' : ''}`}
                        onClick={() => setMaterialsReady(value)}
                        onKeyDown={(event) => handleRadioKeyDown(
                          event,
                          MATERIALS_READY_OPTIONS.map((option) => option.value),
                          materialsReady,
                          setMaterialsReady
                        )}
                        aria-label={label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="smallest-step">Smallest useful step</label>
                  <input
                    id="smallest-step"
                    type="text"
                    value={smallestStep}
                    onChange={(e) => setSmallestStep(e.target.value)}
                    placeholder="What's the tiniest first step?"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="five-minute">
                    Optional five-minute version
                  </label>
                  <input
                    id="five-minute"
                    type="text"
                    value={fiveMinuteVersion}
                    onChange={(e) => setFiveMinuteVersion(e.target.value)}
                    placeholder="What could you do in five minutes?"
                  />
                </div>
              </>
            )}

            {/* Save button inside expanded area */}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleSave}
              disabled={isSaving || !rawThought.trim()}
              aria-label="Save with details"
              style={{ marginTop: 8 }}
            >
              {justSaved ? <Check size={18} /> : <Sparkles size={18} />}
              {isSaving ? 'Saving…' : justSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
