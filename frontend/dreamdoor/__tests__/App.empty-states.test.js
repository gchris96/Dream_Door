import React from 'react';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import App from '../App';

const houseFixture = {
  id: 1,
  price: 150000,
  address_line: '123 Main St',
  city: 'Logan',
  state: 'UT',
  beds: 2,
  baths: 1,
  sqft: 1200,
  property_type: 'house',
};

const mockFetchOnce = (value) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => value,
  });
};

const mockFetchWithDeck = (houses) => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/api/deck/')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ results: houses }),
      });
    }
    if (url.endsWith('/api/saved/')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ results: [] }),
      });
    }
    if (url.includes('/detail/')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    }
    if (url.includes('/photos/')) {
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
};

describe('App empty and error states', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('shows API error state with retry hint', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
    const { getByText } = render(<App />);

    fireEvent.press(getByText('Browse All Homes'));

    await waitFor(() => {
      expect(getByText("Couldn't load houses. Pull to retry.")).toBeTruthy();
    });
    consoleSpy.mockRestore();
  });

  it('shows empty range message when filters exclude all houses', async () => {
    mockFetchOnce({ results: [houseFixture] });
    const { getByText, getByTestId } = render(<App />);

    fireEvent.press(getByText('Browse All Homes'));
    await waitFor(() => expect(getByText('Filter')).toBeTruthy());

    fireEvent.press(getByText('Filter'));
    await waitFor(() => expect(getByText('Filter Homes')).toBeTruthy());

    const minInput = getByTestId('filter-min-input');
    fireEvent.changeText(minInput, '9000000');
    fireEvent(minInput, 'endEditing');

    fireEvent.press(getByText('Apply Filters'));

    await waitFor(() => {
      expect(getByText('No houses in this range')).toBeTruthy();
    });
  });

  it('shows deck end message when no houses are available', async () => {
    mockFetchOnce({ results: [] });
    const { getByText } = render(<App />);

    fireEvent.press(getByText('Browse All Homes'));

    await waitFor(() => {
      expect(getByText("You've reached the end of this deck")).toBeTruthy();
    });
  });

  it('keeps filtered deck after a swipe', async () => {
    const houses = [
      {
        ...houseFixture,
        id: 1,
        address_line: '123 Main St',
        property_type: 'multi_family',
      },
      {
        ...houseFixture,
        id: 2,
        address_line: '456 Elm St',
        property_type: 'multi_family',
      },
    ];
    mockFetchWithDeck(houses);
    const { getByText, getByTestId, queryByText } = render(<App />);

    fireEvent.press(getByText('Browse All Homes'));
    await waitFor(() => expect(getByText('Filter')).toBeTruthy());

    fireEvent.press(getByText('Filter'));
    await waitFor(() => expect(getByText('Filter Homes')).toBeTruthy());

    fireEvent.press(getByText('multi family'));
    fireEvent.press(getByText('Apply Filters'));

    await waitFor(() => {
      const card = getByTestId('swipe-card');
      expect(within(card).getByText('123 Main St, Logan, UT')).toBeTruthy();
    });

    act(() => {
      fireEvent.press(getByTestId('test-like'));
    });

    await waitFor(() => {
      const nextCard = getByTestId('swipe-card');
      expect(within(nextCard).getByText('456 Elm St, Logan, UT')).toBeTruthy();
    });
    expect(queryByText("You've reached the end of this deck")).toBeNull();
  });
});
