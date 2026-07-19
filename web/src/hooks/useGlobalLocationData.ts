import { useState, useEffect } from 'react';

export interface Country {
  iso2: string;
  iso3: string;
  country: string;
}

export interface State {
  name: string;
  state_code: string;
}

export function useGlobalCountries() {
  const [data, setData] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('https://countriesnow.space/api/v0.1/countries/iso')
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          setData(json.data.map((c: any) => ({
            iso2: c.Iso2,
            iso3: c.Iso3,
            country: c.name
          })));
        } else {
          setIsError(true);
        }
      })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, isError };
}

export function useGlobalStates(country: string) {
  const [data, setData] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!country || country.toLowerCase() === 'brazil' || country.toLowerCase() === 'brasil') {
      setData([]);
      return;
    }

    setIsLoading(true);
    fetch('https://countriesnow.space/api/v0.1/countries/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    })
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          setData(json.data.states || []);
        } else {
          setData([]);
        }
      })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [country]);

  return { data, isLoading, isError };
}

export function useGlobalCitiesForCountry(country: string) {
  const [data, setData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!country || country.toLowerCase() === 'brazil' || country.toLowerCase() === 'brasil') {
      setData([]);
      return;
    }

    setIsLoading(true);
    fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    })
      .then(res => res.json())
      .then(json => {
        if (!json.error) {
          setData(json.data || []);
        } else {
          setData([]);
        }
      })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [country]);

  return { data, isLoading, isError };
}
