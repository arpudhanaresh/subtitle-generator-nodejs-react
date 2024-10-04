import React from 'react';
import Upload from './components/upload';
import RecentSubtitles from './components/RecentSubtitles';

function App() {
  return (
    <div className="App">
      <div className="main-content">
        <Upload />
      </div>
      <div className="sidebar">
        <RecentSubtitles />
      </div>
    </div>
  );
}

export default App;
