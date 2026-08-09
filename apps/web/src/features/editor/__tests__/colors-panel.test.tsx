import { createDefaultDefinition, type DesignSystemDefinition } from '@dsg/contracts';
import { resolveDesignSystem } from '@dsg/tokens';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorsPanel } from '../panels/colors-panel.js';

function renderPanel(definition: DesignSystemDefinition = createDefaultDefinition()) {
  const onChange = vi.fn();
  render(
    <ColorsPanel
      draft={definition}
      resolved={resolveDesignSystem(definition)}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('ColorsPanel palettes', () => {
  it('renders a swatch row per palette', () => {
    renderPanel();

    expect(screen.getByLabelText('Name for brand palette')).toHaveValue('brand');
    expect(screen.getByLabelText('Name for neutral palette')).toHaveValue('neutral');
  });

  it('updates the base color', () => {
    const onChange = renderPanel();

    fireEvent.change(screen.getByLabelText('Base color for brand'), {
      target: { value: '#ff0000' },
    });

    const next = onChange.mock.calls[0]![0] as DesignSystemDefinition;
    expect(next.colors.palettes[0]!.baseColor).toBe('#ff0000');
  });

  it('carries semantic references across a rename', () => {
    const onChange = renderPanel();

    fireEvent.change(screen.getByLabelText('Name for brand palette'), {
      target: { value: 'primary-brand' },
    });

    const next = onChange.mock.calls[0]![0] as DesignSystemDefinition;

    expect(next.colors.palettes[0]!.name).toBe('primary-brand');
    // Without the remap these would still point at "brand" and the document would be invalid.
    expect(next.colors.semantic.light.primary.palette).toBe('primary-brand');
    expect(next.colors.semantic.light.ring.palette).toBe('primary-brand');
    expect(next.colors.semantic.dark.primary.palette).toBe('primary-brand');
    // Unrelated tokens are untouched.
    expect(next.colors.semantic.light.background.palette).toBe('neutral');
  });

  it('blocks deleting a palette a semantic token still uses', () => {
    renderPanel();

    expect(screen.getByLabelText('Delete brand palette')).toBeDisabled();
  });

  it('allows deleting an unreferenced palette', () => {
    const definition = createDefaultDefinition();
    definition.colors.palettes.push({
      name: 'spare',
      baseColor: '#00ff00',
      hueShift: 0,
      chroma: 1,
    });

    const onChange = renderPanel(definition);
    const deleteButton = screen.getByLabelText('Delete spare palette');
    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);

    const next = onChange.mock.calls[0]![0] as DesignSystemDefinition;
    expect(next.colors.palettes.map((palette) => palette.name)).not.toContain('spare');
  });

  it('adds a palette with a name that does not collide', () => {
    const onChange = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    const next = onChange.mock.calls[0]![0] as DesignSystemDefinition;
    const names = next.colors.palettes.map((palette) => palette.name);

    expect(names).toHaveLength(5);
    expect(new Set(names).size).toBe(5);
  });
});

describe('ColorsPanel semantics', () => {
  it('edits the light theme by default and switches to dark', () => {
    const onChange = renderPanel();

    fireEvent.change(screen.getByLabelText('primary step'), { target: { value: '700' } });

    const afterLight = onChange.mock.calls[0]![0] as DesignSystemDefinition;
    expect(afterLight.colors.semantic.light.primary.step).toBe(700);
    // The other theme is left alone.
    expect(afterLight.colors.semantic.dark.primary.step).toBe(500);
  });

  it('repoints a semantic token at another palette', () => {
    const onChange = renderPanel();

    fireEvent.change(screen.getByLabelText('destructive palette'), {
      target: { value: 'accent' },
    });

    const next = onChange.mock.calls[0]![0] as DesignSystemDefinition;
    expect(next.colors.semantic.light.destructive.palette).toBe('accent');
  });

  it('shows contrast grades for the default system', () => {
    renderPanel();

    expect(screen.getByText('foreground on background')).toBeInTheDocument();
    expect(screen.getAllByText('AAA').length).toBeGreaterThan(0);
  });
});
