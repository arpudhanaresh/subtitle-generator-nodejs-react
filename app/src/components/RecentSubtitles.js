import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RecentSubtitles = () => {
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch recent subtitles on component mount
  useEffect(() => {
    const fetchRecentSubtitles = async () => {
      try {
        const res = await axios.get('http://localhost:5000/subtitles/recent'); // Correct endpoint
        setSubtitles(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching recent subtitles:', err);
        setError('Error fetching recent subtitles');
        setLoading(false);
      }
    };

    fetchRecentSubtitles();
  }, []);

  const downloadSubtitle = (sha256) => {
    window.open(`http://localhost:5000/subtitles/${sha256}`, '_blank');
  };

  return (
    <div className="recent-subtitles">
      <h3>Recent Subtitles</h3>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <ul>
          {subtitles.map((subtitle) => (
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
