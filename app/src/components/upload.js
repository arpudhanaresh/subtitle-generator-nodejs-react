import React, { useState } from 'react';
import axios from 'axios';
import './styles.css'; // Import the CSS file

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [sha256, setSha256] = useState('');
    const [videoFileSize, setVideoFileSize] = useState(null);
    const [subtitleSize, setSubtitleSize] = useState(null);
    const [videoURL, setVideoURL] = useState(null); // Store the video URL
    const [shareURL, setShareURL] = useState(''); // Store the shareable URL
    const [copySuccess, setCopySuccess] = useState(''); // Success message for copy

    const onFileChange = (selectedFile) => {
        setFile(selectedFile);
        if (selectedFile) {
            setVideoFileSize(selectedFile.size);
            // Create a local URL for the video file and set the videoURL state
            const videoUrl = URL.createObjectURL(selectedFile);
            setVideoURL(videoUrl);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        const selectedFile = e.dataTransfer.files[0];
        if (selectedFile) {
            onFileChange(selectedFile);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault(); // Prevent default to allow drop
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('video', file);

        try {
            const res = await axios.post('http://localhost:5000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage(res.data.message);
            setSha256(res.data.sha256);
            setSubtitleSize(res.data.subtitleSize);
        } catch (err) {
            if (err.response && err.response.data) {
                setMessage(err.response.data.error);
            } else {
                setMessage('An error occurred during the upload.');
            }
        }
    };

    const downloadSubtitles = () => {
        window.open(`http://localhost:5000/subtitles/${sha256}`, '_blank');
    };

    // Function to share subtitles via file.io
    const shareSubtitle = async () => {
        try {
            // Fetch the subtitle file from the backend in SRT format
            const res = await axios.get(`http://localhost:5000/subtitles/${sha256}`, {
                responseType: 'blob',
            });

            // Create a FormData object and append the subtitle file to it
            const formData = new FormData();
            formData.append('file', new Blob([res.data], { type: 'text/plain' }), `subtitle_${sha256}.srt`);

            // Upload the subtitle file to file.io
            const uploadRes = await axios.post('https://file.io/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Store the file.io link in the state
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

    const formatFileSize = (sizeInBytes) => {
        const units = ['Bytes', 'KB', 'MB', 'GB'];
        let size = sizeInBytes;
        let unitIndex = 0;

        while (size > 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    return (
        <div className="container">
            <h2>Upload Video File</h2>
            <form onSubmit={onSubmit}>
                <div
                    className="drop-area"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                >
                    {file ? file.name : 'Drag & drop your video file here or click to select'}
                </div>
                <input
                    type="file"
                    name="video"
                    onChange={(e) => onFileChange(e.target.files[0])}
                    style={{ display: 'none' }} // Hide default file input
                />
                <button type="button" onClick={() => document.querySelector('input[type="file"]').click()}>
                    Select File
                </button>
                {videoFileSize !== null && (
                    <p>Selected File Size: {formatFileSize(videoFileSize)}</p>
                )}
                <button type="submit">Upload</button>
            </form>
            {message && <p className="message">{message}</p>}
            {subtitleSize !== null && (
                <p className="subtitle-info">Subtitle Size: {subtitleSize} sentences</p>
            )}
            {sha256 && (
                <>
                    <button onClick={downloadSubtitles}>Download Subtitles</button>
                    <button onClick={shareSubtitle}>Share Subtitles</button>
                </>
            )}

            {/* Video player */}
            {videoURL && (
                <div className="video-player">
                    <h3>Preview Video</h3>
                    <video controls width="400" src={videoURL}>
                        Your browser does not support the video tag.
                    </video>
                </div>
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

export default FileUpload;
