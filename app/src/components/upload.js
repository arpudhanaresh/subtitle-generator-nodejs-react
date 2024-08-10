import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [sha256, setSha256] = useState('');
    const [videoFileSize, setVideoFileSize] = useState(null);
    const [subtitleSize, setSubtitleSize] = useState(null);

    const onFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        if (selectedFile) {
            setVideoFileSize(selectedFile.size);
        }
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
            setSubtitleSize(res.data.subtitleSize);   // Set the subtitle size
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
        <div>
            <h2>Upload Video File</h2>
            <form onSubmit={onSubmit}>
                <input type="file" name="video" onChange={onFileChange} />
                {videoFileSize !== null && <p>Selected File Size: {formatFileSize(videoFileSize)}</p>}
                <button type="submit">Upload</button>
            </form>
            {message && <p>{message}</p>}
            {subtitleSize !== null && <p>Subtitle Size: {subtitleSize} sentences</p>}
            {sha256 && (
                <button onClick={downloadSubtitles}>Download Subtitles</button>
            )}
        </div>
    );
};

export default FileUpload;
