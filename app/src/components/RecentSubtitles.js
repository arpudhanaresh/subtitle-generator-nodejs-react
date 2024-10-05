import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecentSubtitles = () => {
  const [subtitles, setSubtitles] = useState([]);
  const [filteredSubtitles, setFilteredSubtitles] = useState([]); // For filtered results
  const [searchTerm, setSearchTerm] = useState(''); // Search term
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch recent subtitles on component mount
  useEffect(() => {
    const fetchRecentSubtitles = async () => {
      try {
        const res = await axios.get('http://localhost:5000/subtitles/recent');
        setSubtitles(res.data);
        setFilteredSubtitles(res.data); // Initialize filtered subtitles with all subtitles
        setLoading(false);
      } catch (err) {
        console.error('Error fetching recent subtitles:', err);
        setError('Error fetching recent subtitles');
        setLoading(false);
      }
    };

    fetchRecentSubtitles();
  }, []);

  // Handle search input change and filter subtitles
  const handleSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    setSearchTerm(searchTerm);

    // Filter subtitles based on the search term
    const filtered = subtitles.filter((subtitle) =>
      subtitle.originalFilename.toLowerCase().includes(searchTerm)
    );
    setFilteredSubtitles(filtered);
  };

  const downloadSubtitle = (sha256) => {
    window.open(`http://localhost:5000/subtitles/${sha256}`, '_blank');
  };

  return (
    <div className="recent-subtitles">
      <h3>Recent Subtitles</h3>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search by name..."
        value={searchTerm}
        onChange={handleSearch}
        className="search-input"
      />

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>{error}</p>
      ) : filteredSubtitles.length === 0 ? (
        <p>No subtitles found</p>
      ) : (
        <ul>
          {filteredSubtitles.map((subtitle) => (
            <li key={subtitle._id}>
              <p>
                {subtitle.originalFilename} - {subtitle.subtitles.length} sentences
              </p>
              <button onClick={() => downloadSubtitle(subtitle.sha256)}>Download</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentSubtitles;
