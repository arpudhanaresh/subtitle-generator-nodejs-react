import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [sha256, setSha256] = useState('');

    const onFileChange = (e) => {
        setFile(e.target.files[0]);
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

    return (
        <div>
            <h2>Upload Video File</h2>
            <form onSubmit={onSubmit}>
                <input type="file" name="video" onChange={onFileChange} />
                <button type="submit">Upload</button>
            </form>
            {message && <p>{message}</p>}
            {sha256 && (
                <button onClick={downloadSubtitles}>Download Subtitles</button>
            )}
        </div>
    );
};

export default FileUpload;
