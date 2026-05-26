'use client';

import { useState, FormEvent } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { CareersApplication } from '@/lib/supabase/content-types';
import styles from './HireForm.module.css';

const EMPTY_REFERENCE = { name: '', company: '', phone: '', address: '' };
const EMPTY_JOB = {
  company: '',
  phone: '',
  address: '',
  startingSalary: '',
  endingSalary: '',
  startDate: '',
  endDate: '',
  jobTitle: '',
  reasonForLeaving: '',
};
const EMPTY_EDU = { name: '', start: '', finish: '', graduated: false };

function emptyApplication(): CareersApplication {
  return {
    applicant: {
      name: '',
      address: '',
      phone: '',
      email: '',
      age: '',
      dateAvailable: '',
      desiredPosition: '',
      usCitizen: false,
      convictedCrime: false,
      crimeDetails: '',
    },
    driversLicense: {
      hasLicense: false,
      hasCdl: false,
      licenseState: '',
      primaryTransportation: '',
      accidents3yr: '',
      violations3yr: '',
    },
    education: {
      highSchool: { ...EMPTY_EDU },
      college: { ...EMPTY_EDU },
      other: '',
    },
    references: [
      { ...EMPTY_REFERENCE },
      { ...EMPTY_REFERENCE },
      { ...EMPTY_REFERENCE },
    ],
    previousEmployment: [
      { ...EMPTY_JOB },
      { ...EMPTY_JOB },
      { ...EMPTY_JOB },
    ],
    military: {
      served: false,
      startDate: '',
      endDate: '',
      branch: '',
      rank: '',
      dischargeType: '',
    },
    certification: { certified: false, signature: '' },
  };
}

export default function HireForm({
  positions,
}: {
  positions: { title: string; detail: string }[];
}) {
  const [value, setValue] = useState<CareersApplication>(emptyApplication);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setApplicant<K extends keyof CareersApplication['applicant']>(
    key: K,
    v: CareersApplication['applicant'][K]
  ) {
    setValue((p) => ({ ...p, applicant: { ...p.applicant, [key]: v } }));
  }
  function setLicense<K extends keyof CareersApplication['driversLicense']>(
    key: K,
    v: CareersApplication['driversLicense'][K]
  ) {
    setValue((p) => ({
      ...p,
      driversLicense: { ...p.driversLicense, [key]: v },
    }));
  }
  function setEduEntry(
    which: 'highSchool' | 'college',
    patch: Partial<CareersApplication['education']['highSchool']>
  ) {
    setValue((p) => ({
      ...p,
      education: {
        ...p.education,
        [which]: { ...p.education[which], ...patch },
      },
    }));
  }
  function setReference(i: number, patch: Partial<CareersApplication['references'][number]>) {
    setValue((p) => {
      const next = p.references.slice();
      next[i] = { ...next[i], ...patch };
      return { ...p, references: next };
    });
  }
  function setJob(i: number, patch: Partial<CareersApplication['previousEmployment'][number]>) {
    setValue((p) => {
      const next = p.previousEmployment.slice();
      next[i] = { ...next[i], ...patch };
      return { ...p, previousEmployment: next };
    });
  }
  function setMilitary<K extends keyof CareersApplication['military']>(
    key: K,
    v: CareersApplication['military'][K]
  ) {
    setValue((p) => ({ ...p, military: { ...p.military, [key]: v } }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!value.certification.certified) {
      setError('Please check the certification box at the bottom of the form.');
      return;
    }
    if (!value.certification.signature.trim()) {
      setError('Please type your name as electronic signature.');
      return;
    }
    if (!value.applicant.name.trim() || !value.applicant.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    setSubmitting(true);

    const summary = `Hire application — ${value.applicant.name}${
      value.applicant.desiredPosition ? ' for ' + value.applicant.desiredPosition : ''
    }`;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('cvy_messages').insert({
      form_type: 'careers',
      name: value.applicant.name.trim(),
      email: value.applicant.email.trim(),
      phone: value.applicant.phone || null,
      address: value.applicant.address || null,
      position: value.applicant.desiredPosition || null,
      message: summary,
      application_data: value,
    });

    if (error) {
      setError('Sorry — something went wrong submitting. Please try again or call us directly.');
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className={styles.success}>
        <span className={styles.successIcon}>&#10003;</span>
        <h3>Application received</h3>
        <p>
          Thanks for your interest in joining our team! We&apos;ll review your
          application and get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <p className={styles.intro}>
        We&apos;re always looking for hard-working people to join our team. Fill
        out this form with your basic information, and we&apos;ll get back to
        you soon.
      </p>

      {/* ============ Applicant Information ============ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Applicant Information</h2>

        <div className={styles.grid2}>
          <Field label="Name" required>
            <input
              className={styles.input}
              required
              value={value.applicant.name}
              onChange={(e) => setApplicant('name', e.target.value)}
            />
          </Field>
          <Field label="Desired Position">
            <select
              className={styles.input}
              value={value.applicant.desiredPosition}
              onChange={(e) => setApplicant('desiredPosition', e.target.value)}
            >
              <option value="">Select…</option>
              {positions.map((p) => (
                <option key={p.title} value={p.title}>
                  {p.title}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </Field>
        </div>

        <div className={styles.grid2}>
          <Field label="Address">
            <input
              className={styles.input}
              value={value.applicant.address}
              onChange={(e) => setApplicant('address', e.target.value)}
            />
          </Field>
          <div className={styles.checkboxGroup}>
            <Checkbox
              label="Are you a United States citizen?"
              checked={value.applicant.usCitizen}
              onChange={(c) => setApplicant('usCitizen', c)}
            />
            <Checkbox
              label="Have you been convicted of a crime?"
              checked={value.applicant.convictedCrime}
              onChange={(c) => setApplicant('convictedCrime', c)}
            />
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.gridSubpair}>
            <Field label="Phone Number">
              <input
                className={styles.input}
                value={value.applicant.phone}
                onChange={(e) => setApplicant('phone', e.target.value)}
              />
            </Field>
            <Field label="Email Address" required>
              <input
                className={styles.input}
                type="email"
                required
                value={value.applicant.email}
                onChange={(e) => setApplicant('email', e.target.value)}
              />
            </Field>
          </div>
          {value.applicant.convictedCrime ? (
            <Field label="If yes, what is the crime?">
              <textarea
                className={styles.textarea}
                rows={4}
                value={value.applicant.crimeDetails}
                onChange={(e) => setApplicant('crimeDetails', e.target.value)}
              />
            </Field>
          ) : (
            <div />
          )}
        </div>

        <div className={styles.gridSubpair}>
          <Field label="Age">
            <input
              className={styles.input}
              inputMode="numeric"
              value={value.applicant.age}
              onChange={(e) => setApplicant('age', e.target.value)}
            />
          </Field>
          <Field label="Date Available">
            <input
              className={styles.input}
              type="date"
              value={value.applicant.dateAvailable}
              onChange={(e) => setApplicant('dateAvailable', e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ============ Driver's License ============ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Driver&apos;s License</h2>

        <div className={styles.checkboxRow}>
          <Checkbox
            label="Do you have a driver's license?"
            checked={value.driversLicense.hasLicense}
            onChange={(c) => setLicense('hasLicense', c)}
          />
          <Checkbox
            label="Do you have a commercial driver's license?"
            checked={value.driversLicense.hasCdl}
            onChange={(c) => setLicense('hasCdl', c)}
          />
        </div>

        <div className={styles.grid2}>
          <Field label="Driver's License State">
            <input
              className={styles.input}
              value={value.driversLicense.licenseState}
              onChange={(e) => setLicense('licenseState', e.target.value)}
            />
          </Field>
          <Field label="Primary Form of Transportation">
            <input
              className={styles.input}
              value={value.driversLicense.primaryTransportation}
              onChange={(e) => setLicense('primaryTransportation', e.target.value)}
            />
          </Field>
        </div>

        <div className={styles.grid2}>
          <Field label="How many accidents have you had in the last 3 years?">
            <input
              className={styles.input}
              inputMode="numeric"
              value={value.driversLicense.accidents3yr}
              onChange={(e) => setLicense('accidents3yr', e.target.value)}
            />
          </Field>
          <Field label="How many driving violations have you had in the last 3 years?">
            <input
              className={styles.input}
              inputMode="numeric"
              value={value.driversLicense.violations3yr}
              onChange={(e) => setLicense('violations3yr', e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ============ Education ============ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Education</h2>

        <EducationRow
          label="High School"
          entry={value.education.highSchool}
          onChange={(patch) => setEduEntry('highSchool', patch)}
        />
        <EducationRow
          label="College"
          entry={value.education.college}
          onChange={(patch) => setEduEntry('college', patch)}
        />

        <Field label="Other Education">
          <textarea
            className={styles.textarea}
            rows={4}
            value={value.education.other}
            onChange={(e) =>
              setValue((p) => ({
                ...p,
                education: { ...p.education, other: e.target.value },
              }))
            }
          />
        </Field>
      </section>

      {/* ============ References ============ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>References</h2>
        {value.references.map((r, i) => (
          <div key={i} className={styles.subBlock}>
            <div className={styles.grid4}>
              <Field label="Name">
                <input
                  className={styles.input}
                  value={r.name}
                  onChange={(e) => setReference(i, { name: e.target.value })}
                />
              </Field>
              <Field label="Company">
                <input
                  className={styles.input}
                  value={r.company}
                  onChange={(e) => setReference(i, { company: e.target.value })}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  className={styles.input}
                  value={r.phone}
                  onChange={(e) => setReference(i, { phone: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <input
                  className={styles.input}
                  value={r.address}
                  onChange={(e) => setReference(i, { address: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))}
      </section>

      {/* ============ Previous Employment ============ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Previous Employment</h2>
        {value.previousEmployment.map((j, i) => (
          <div key={i} className={styles.subBlock}>
            <div className={styles.grid3}>
              <Field label="Company">
                <input
                  className={styles.input}
                  value={j.company}
                  onChange={(e) => setJob(i, { company: e.target.value })}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  className={styles.input}
                  value={j.phone}
                  onChange={(e) => setJob(i, { phone: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <input
                  className={styles.input}
                  value={j.address}
                  onChange={(e) => setJob(i, { address: e.target.value })}
                />
              </Field>
            </div>
            <div className={styles.grid4}>
              <Field label="Starting Salary">
                <input
                  className={styles.input}
                  value={j.startingSalary}
                  onChange={(e) => setJob(i, { startingSalary: e.target.value })}
                />
              </Field>
              <Field label="Ending Salary">
                <input
                  className={styles.input}
                  value={j.endingSalary}
                  onChange={(e) => setJob(i, { endingSalary: e.target.value })}
                />
              </Field>
              <Field label="Start date">
                <input
                  className={styles.input}
                  type="date"
                  value={j.startDate}
                  onChange={(e) => setJob(i, { startDate: e.target.value })}
                />
              </Field>
              <Field label="End date">
                <input
                  className={styles.input}
                  type="date"
                  value={j.endDate}
                  onChange={(e) => setJob(i, { endDate: e.target.value })}
                />
              </Field>
            </div>
            <div className={styles.grid2}>
              <Field label="Job Title">
                <input
                  className={styles.input}
                  value={j.jobTitle}
                  onChange={(e) => setJob(i, { jobTitle: e.target.value })}
                />
              </Field>
              <Field label="Why did you leave?">
                <input
                  className={styles.input}
                  value={j.reasonForLeaving}
                  onChange={(e) =>
                    setJob(i, { reasonForLeaving: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>
        ))}
      </section>

      {/* ============ Military Service ============ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Military Service</h2>

        <Checkbox
          label="Have you served in the military?"
          checked={value.military.served}
          onChange={(c) => setMilitary('served', c)}
        />

        {value.military.served && (
          <>
            <div className={styles.grid2}>
              <Field label="When did you start?">
                <input
                  className={styles.input}
                  type="date"
                  value={value.military.startDate}
                  onChange={(e) => setMilitary('startDate', e.target.value)}
                />
              </Field>
              <Field label="When did you leave?">
                <input
                  className={styles.input}
                  type="date"
                  value={value.military.endDate}
                  onChange={(e) => setMilitary('endDate', e.target.value)}
                />
              </Field>
            </div>
            <div className={styles.grid3}>
              <Field label="Branch">
                <input
                  className={styles.input}
                  value={value.military.branch}
                  onChange={(e) => setMilitary('branch', e.target.value)}
                />
              </Field>
              <Field label="Rank">
                <input
                  className={styles.input}
                  value={value.military.rank}
                  onChange={(e) => setMilitary('rank', e.target.value)}
                />
              </Field>
              <Field label="Type of Discharge">
                <input
                  className={styles.input}
                  value={value.military.dischargeType}
                  onChange={(e) => setMilitary('dischargeType', e.target.value)}
                />
              </Field>
            </div>
          </>
        )}
      </section>

      {/* ============ Certification ============ */}
      <section className={styles.section}>
        <Checkbox
          label="By checking this box and typing my name below, I certify that my answers are true and complete to the best of my knowledge. If this application leads to my employment, I understand that false or misleading information may result in my release."
          checked={value.certification.certified}
          onChange={(c) =>
            setValue((p) => ({
              ...p,
              certification: { ...p.certification, certified: c },
            }))
          }
        />

        <Field label="Electronic Signature (type your name)">
          <input
            className={styles.input}
            value={value.certification.signature}
            onChange={(e) =>
              setValue((p) => ({
                ...p,
                certification: { ...p.certification, signature: e.target.value },
              }))
            }
          />
        </Field>
      </section>

      {error && <div className={styles.errorBox}>{error}</div>}

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}

// ---------- Subcomponents ----------

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label}
        {required && <span aria-hidden> *</span>}
      </span>
      {children}
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <label className={styles.checkbox}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function EducationRow({
  label,
  entry,
  onChange,
}: {
  label: string;
  entry: { name: string; start: string; finish: string; graduated: boolean };
  onChange: (patch: Partial<typeof entry>) => void;
}) {
  return (
    <div className={styles.subBlock}>
      <div className={styles.educationGrid}>
        <Field label={label}>
          <input
            className={styles.input}
            value={entry.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field label="When did you start?">
          <input
            className={styles.input}
            type="date"
            value={entry.start}
            onChange={(e) => onChange({ start: e.target.value })}
          />
        </Field>
        <Field label="When did you finish?">
          <input
            className={styles.input}
            type="date"
            value={entry.finish}
            onChange={(e) => onChange({ finish: e.target.value })}
          />
        </Field>
        <Checkbox
          label="Did you graduate?"
          checked={entry.graduated}
          onChange={(c) => onChange({ graduated: c })}
        />
      </div>
    </div>
  );
}
