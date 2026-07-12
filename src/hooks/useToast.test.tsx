import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './useToast';

function ToastHarness() {
  const { toasts, showToast } = useToast();

  return (
    <>
      <button type="button" onClick={() => showToast('Saved successfully', 'success')}>
        Save
      </button>
      <output>{toasts.map((toast) => toast.message).join(', ')}</output>
    </>
  );
}

describe('ToastProvider', () => {
  it('shares notifications with all consumers in the provider', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });
});
