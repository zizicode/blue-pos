import { useState, useEffect, useRef } from "react";
import "./SearchSelectProps.scss";

interface SearchSelectProps<T> {
  label?: string;
  required?: boolean;
  items: T[];
  displayKey: keyof T;
  returnKey?: keyof T;
  placeholder?: string;
  onSelect: (value: any, item: T) => void;
  disabled?: boolean;
  maxResults?: number;
  defaultValue?: any;
  onSelectClean?: boolean
}


function SearchSelect<T extends Record<string, any>>({
  items,
  displayKey,
  returnKey,
  placeholder = "Buscar...",
  onSelect,
  disabled = false,
  maxResults,
  label,
  required,
  defaultValue,
  onSelectClean = false,
}: SearchSelectProps<T>) {
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<T[]>([]);
  const [showList, setShowList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  let returnKeyX = 'id'

  useEffect(() => {
    if (defaultValue && items.length > 0) {
      const itemDefault = items.find(
        (item) => item[returnKeyX ?? displayKey] === defaultValue
      );
      if (itemDefault) {
        setSearch(String(itemDefault[displayKey]));
      }
    }
  }, [defaultValue, items, returnKeyX, displayKey]);

  useEffect(() => {
    if (search.trim() === "") {
      setFiltered(items);
    } else {
      const lower = search.toLowerCase();

      setFiltered(
        items.filter(item =>
          Object.values(item).some(value =>
            value && String(value).toLowerCase().includes(lower)
          )
        )
      );
    }
  }, [search, items]);

  // Cierra lista si clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    setSearch(String(item[displayKey]));
    setShowList(false);
    if (onSelectClean) setSearch('')
    const value = returnKey ? item[returnKey] : item;
    onSelect(value, item);
  };

  return (
    <div className="search-select" ref={wrapperRef}>
      {label && (
        <label className="form-label">
          {label} {required && <span className="required">*</span>}
        </label>
      )}

      <input
        type="text"
        className="search-select-input"
        placeholder={placeholder}
        style={{ flex: 1, width: '90%' }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setShowList(true)}
        disabled={disabled}
      />

      {showList && (
        <ul className="search-select-list">
          {filtered.length > 0 ? (
            filtered.slice(0, maxResults ?? filtered.length).map((item, index) => (
              <li
                key={index}
                className="search-select-item"
                onClick={() => handleSelect(item)}
              >
                {String(item[displayKey])}
              </li>
            ))
          ) : (
            <li className="search-select-empty">Sin resultados</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default SearchSelect;
