import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MlsPhotoCarousel } from '../components/MlsPhotoCarousel';

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }));
afterEach(cleanup);

describe('MLS carousel photo failures', () => {
  it('uses the first30 distinct sanctioned Elmira page assets after the feed fails', () => {
    render(<MlsPhotoCarousel photos={['https://images.example/empty.jpg']} address="Elmira" researchId="40" />);
    fireEvent.error(screen.getByRole('img'));
    const sources=screen.getAllByRole('img',{hidden:true}).map(img=>img.getAttribute('data-photo-url'));
    expect(sources).toHaveLength(30);
    expect(new Set(sources).size).toBe(30);
    expect(sources[0]).toContain('elmira-public-gallery-00.jpg');
    expect(sources[1]).toContain('elmira-public-gallery-01.jpg');
    expect(sources[29]).toContain('elmira-public-gallery-29.jpg');
    expect(screen.getByRole('button',{name:'Next photo'})).toBeInTheDocument();
  });
  it('removes a failed slide and hides controls when only one remains', () => {
    render(<MlsPhotoCarousel photos={['https://images.example/front.jpg', 'https://images.example/inside.jpg']} address="Test street" />);
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeInTheDocument();
    fireEvent.error(screen.getByAltText('Test street, MLS photo 1, front exterior'));
    expect(screen.queryByAltText('Test street, MLS photo 1, front exterior')).not.toBeInTheDocument();
    expect(screen.getByAltText('Test street, MLS photo 2')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    fireEvent.error(screen.getByAltText('Test street, MLS photo 2'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Listing photos unavailable')).toBeInTheDocument();
  });
  it('resets failed photos when a new gallery arrives', () => {
    const view = render(<MlsPhotoCarousel photos={['https://images.example/old.jpg']} address="Test street" />);
    fireEvent.error(screen.getByRole('img'));
    view.rerender(<MlsPhotoCarousel photos={['https://images.example/new.jpg']} address="Test street" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://images.example/new.jpg');
  });
  it('loads noninitial slides lazily and prevents control clicks from bubbling', () => {
    const parentClick = vi.fn();
    render(<div onClick={parentClick}><MlsPhotoCarousel photos={['https://images.example/front.jpg', 'https://images.example/inside.jpg']} address="Test street" /></div>);
    expect(screen.getByAltText('Test street, MLS photo 2')).toHaveAttribute('loading', 'lazy');
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(parentClick).not.toHaveBeenCalled();
  });
  it('has no empty controls or image tags without photos', () => {
    render(<MlsPhotoCarousel photos={[]} address="Test street" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
