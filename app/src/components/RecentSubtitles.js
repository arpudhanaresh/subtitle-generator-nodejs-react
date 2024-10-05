import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecentSubtitles = () => {
  const [subtitles, setSubtitles] = useState([]);
  const [filteredSubtitles, setFilteredSubtitles] = useState([]); // For filtered results
  const [searchTerm, setSearchTerm] = useState(''); // Search term
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareURL, setShareURL] = useState(''); // For storing the shareable URL
  const [copySuccess, setCopySuccess] = useState(''); // Copy success message

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

  // Function to handle sharing the subtitle via file.io
  const shareSubtitle = async (sha256, originalFilename) => {
    try {
      // Fetch the subtitle content in SRT format from the server
      const res = await axios.get(`http://localhost:5000/subtitles/${sha256}`, {
        responseType: 'blob',
      });

      // Create a FormData object for uploading the subtitle file to file.io
      const formData = new FormData();
      formData.append('file', new Blob([res.data], { type: 'text/plain' }), `${originalFilename}.srt`);

      // Upload the file to file.io
      const uploadRes = await axios.post('https://file.io/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Get the URL from the file.io response and set it in the state
      setShareURL(uploadRes.data.link);
    } catch (err) {
      console.error('Error sharing subtitle:', err);
    }
  };

  // Function to copy the share URL to the clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareURL).then(
      () => setCopySuccess('Copied!'),
      () => setCopySuccess('Failed to copy!')
    );
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
              <button onClick={() => shareSubtitle(subtitle.sha256, subtitle.originalFilename)}>Share</button>
            </li>
          ))}
        </ul>
      )}

      {/* Display shareable URL */}
      {shareURL && (
        <div className="share-section">
          <p>Shareable URL: <a href={shareURL} target="_blank" rel="noopener noreferrer">{shareURL}</a></p>
          <button onClick={copyToClipboard}>Copy URL</button>
          {copySuccess && <span>{copySuccess}</span>}
        </div>
      )}
    </div>
  );
};

export default RecentSubtitles;
