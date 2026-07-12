import React, { useState, useCallback } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import {
  generateUUID,
  type CaptureType,
  type BusinessCapture,
  type Activity,
  type MoodTag,
  type TimeEstimate,
  type EnergyLevel,
  type CostBand,
  type MaterialsReady,
} from '../types';
import { Sparkles, ChevronDown, ChevronUp, Check } from 'lucide-react';

const CAPTURE_TYPES: { type: CaptureType; label: string }[] = [
  { type: 'business', label: 'Business idea' },
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
  { value: 'under_10', label: '< $10' },
  { value: 'under_50', label: '< $50' },
  { value: 'under_100', label: '< $100' },
  { value: 'over_100', label: '$100+' },
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

export const CapturePage: React.FC = () => {
  const { saveCapture, saveAct, getNextId } = useAppData();
  const { showToast } = useToast();

  // Core fields
  const [rawThought, setRawThought] = useState('');
  const [captureType, setCaptureType] = useState<CaptureType>('business');
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

  const isBusiness = captureType === 'business';

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
  }, []);

  const handleSave = useCallback(async () => {
    if (!rawThought.trim()) {
      showToast('Please enter your thought first', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      if (isBusiness) {
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
    isBusiness,
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
    saveCapture,
    saveAct,
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
      <h1 className="section-title" style={{ marginBottom: 24 }}>
        Capture
      </h1>

      <div className="card">
        {/* Raw thought textarea */}
        <div className="form-group">
          <label htmlFor="raw-thought" className="sr-only">
            What's on your mind?
          </label>
          <textarea
            id="raw-thought"
            value={rawThought}
            onChange={(e) => setRawThought(e.target.value)}
            placeholder="What's on your mind?"
            aria-label="What's on your mind?"
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
          <label style={{ marginBottom: 8, display: 'block' }}>Type</label>
          <div
            className="filter-bar"
            role="radiogroup"
            aria-label="Capture type"
          >
            {CAPTURE_TYPES.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={captureType === type}
                aria-label={label}
                className={`chip ${captureType === type ? 'active' : ''}`}
                onClick={() => setCaptureType(type)}
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
                  <label>Mood</label>
                  <div
                    className="filter-bar"
                    role="group"
                    aria-label="Mood tags"
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
                  <label>Estimated time</label>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-label="Estimated time"
                  >
                    {TIME_ESTIMATES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={estimatedTime === value}
                        className={`chip ${estimatedTime === value ? 'active' : ''}`}
                        onClick={() => setEstimatedTime(value)}
                        aria-label={label}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Energy</label>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-label="Energy level"
                  >
                    {ENERGY_LEVELS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={energy === value}
                        className={`chip ${energy === value ? 'active' : ''}`}
                        onClick={() => setEnergy(value)}
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
                  <label>Cost band</label>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-label="Cost band"
                  >
                    {COST_BANDS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={costBand === value}
                        className={`chip ${costBand === value ? 'active' : ''}`}
                        onClick={() => setCostBand(value)}
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
                  <label>Materials ready</label>
                  <div
                    className="filter-bar"
                    role="radiogroup"
                    aria-label="Materials ready"
                  >
                    {MATERIALS_READY_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={materialsReady === value}
                        className={`chip ${materialsReady === value ? 'active' : ''}`}
                        onClick={() => setMaterialsReady(value)}
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
