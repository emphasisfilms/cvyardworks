'use client';

import { useState, FormEvent } from 'react';
import styles from './ContactForm.module.css';

interface ContactFormProps {
  formType: 'estimate' | 'careers';
  defaultService?: string;
}

export default function ContactForm({ formType, defaultService }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    console.log(`${formType} form submitted:`, data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={styles.success}>
        <span className={styles.successIcon}>&#10003;</span>
        <h3>Thank You!</h3>
        <p>
          {formType === 'estimate'
            ? "We've received your estimate request. We'll be in touch within 24 hours."
            : "Thanks for your interest in joining our team! We'll review your application and get back to you soon."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className="form-group">
        <label htmlFor="name">Full Name</label>
        <input type="text" id="name" name="name" required placeholder="Your name" />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" required placeholder="your@email.com" />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <input type="tel" id="phone" name="phone" required placeholder="(555) 123-4567" />
      </div>

      {formType === 'estimate' && (
        <>
          <div className="form-group">
            <label htmlFor="address">Property Address</label>
            <input
              type="text"
              id="address"
              name="address"
              required
              placeholder="123 Main St, Walpole, NH"
            />
          </div>

          <div className="form-group">
            <label htmlFor="service">Service Type</label>
            <select id="service" name="service" required defaultValue={defaultService || ''}>
              <option value="" disabled>Select a service...</option>
              <optgroup label="Spring">
                <option value="lawn-installation">Lawn Installation</option>
                <option value="landscaping">Landscaping & Design</option>
                <option value="spring-cleanup">Spring Cleanup</option>
                <option value="mulching-spring">Mulching</option>
              </optgroup>
              <optgroup label="Summer">
                <option value="mowing">Mowing & Lawn Maintenance</option>
                <option value="trimming">Bush & Hedge Trimming</option>
                <option value="fertilizing">Fertilizing Programs</option>
              </optgroup>
              <optgroup label="Fall">
                <option value="leaf-cleanup">Leaf Cleanup</option>
                <option value="bed-maintenance">Bed Maintenance</option>
                <option value="perennial-cutting">Perennial Cutting</option>
                <option value="mulching-winter">Mulching for Winter</option>
              </optgroup>
              <optgroup label="Winter">
                <option value="commercial-snow">Commercial Snow Removal</option>
                <option value="residential-snow">Residential Driveway Plowing</option>
                <option value="roof-snow">Roof Snow Removal</option>
              </optgroup>
            </select>
          </div>
        </>
      )}

      {formType === 'careers' && (
        <div className="form-group">
          <label htmlFor="position">Position Interest</label>
          <select id="position" name="position" required defaultValue="">
            <option value="" disabled>Select a position...</option>
            <option value="landscaping-crew">Landscaping Crew</option>
            <option value="lawn-maintenance">Lawn Maintenance</option>
            <option value="snow-removal">Snow Removal</option>
            <option value="crew-leader">Crew Leader</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          placeholder={
            formType === 'estimate'
              ? 'Tell us about your project...'
              : 'Tell us about yourself and your experience...'
          }
        ></textarea>
      </div>

      <button type="submit" className="btn btn-primary">
        {formType === 'estimate' ? 'Request Estimate' : 'Submit Application'}
      </button>
    </form>
  );
}
