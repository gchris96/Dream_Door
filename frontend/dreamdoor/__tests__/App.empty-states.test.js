import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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

describe('App empty and error states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows API error state with retry hint', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
    const { getByText } = render(<App />);

    fireEvent.press(getByText('Browse All Homes'));

    await waitFor(() => {
      expect(getByText("Couldn't load houses. Pull to retry.")).toBeTruthy();
    });
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
});
