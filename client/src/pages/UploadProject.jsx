import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI } from '../services/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function UploadProject() {
  const [method, setMethod] = useState('zip');
  const [file, setFile] = useState(null);
  const [gitUrl, setGitUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.zip')) {
        setFile(droppedFile);
      } else {
        setError('Please upload a ZIP file');
      }
    }
  };

  const handleFileChange = (e) => {
    setError('');
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleZipUpload = async () => {
    if (!file) {
      setError('Please select a ZIP file');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const result = await projectAPI.uploadZip(file, (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        setProgress(percent);
      });

      console.log(
        'Final scan result (JSON):',
        JSON.stringify(result?.data, null, 2),
      );
      navigate(`/project/${result.projectId}`, { state: { data: result } });
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleGitUpload = async () => {
    if (!gitUrl) {
      setError('Please enter a Git URL');
      return;
    }

    // Basic URL validation
    const trimmedUrl = gitUrl.trim();
    if (
      !trimmedUrl.includes('github.com') &&
      !trimmedUrl.includes('gitlab.com') &&
      !trimmedUrl.includes('bitbucket.org')
    ) {
      setError('Please enter a valid GitHub, GitLab, or Bitbucket URL');
      return;
    }

    setUploading(true);
    setError('');
    setStatusMessage('Connecting to repository...');

    try {
      // Show cloning status
      setTimeout(() => {
        if (uploading)
          setStatusMessage('Cloning repository (this may take a minute)...');
      }, 2000);

      setTimeout(() => {
        if (uploading) setStatusMessage('Analyzing files...');
      }, 10000);

      const result = await projectAPI.uploadGit(trimmedUrl);
      console.log(
        'Final scan result (JSON):',
        JSON.stringify(result?.data, null, 2),
      );
      navigate(`/project/${result.projectId}`, { state: { data: result } });
    } catch (err) {
      console.error('Git upload error:', err);

      // Handle different error types
      let errorMessage = 'Failed to clone repository';

      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage =
          'Request timed out. The repository might be too large or your connection is slow.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-200 px-6 py-12">
        <h1 className="mb-4 text-3xl font-semibold text-foreground">
          Upload Your Project
        </h1>

        {/* Tabs using shadcn-style design */}
        <Tabs
          defaultValue="zip"
          onValueChange={(value) => {
            setMethod(value);
            setError('');
          }}
          className="mb-5 text-2xl font-medium text-foreground"
        >
          <TabsList>
            <TabsTrigger value="zip">Upload ZIP</TabsTrigger>
            <TabsTrigger value="git">Git Repository</TabsTrigger>
          </TabsList>
        </Tabs>

        {method === 'zip' && (
          <Card className="border border-border bg-card">
            <CardContent>
              <CardTitle>Upload ZIP File</CardTitle>
              <CardDescription>
                Select a ZIP file containing your codebase for analysis.
              </CardDescription>
              <div
                className={`mt-6 flex h-40 cursor-pointer items-center justify-center rounded-md border-2 border-dashed ${
                  dragActive ? 'border-primary bg-primary/10' : 'border-border'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                {file ? (
                  <span className="text-foreground">{file.name}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Drag and drop a ZIP file here, or click to select
                  </span>
                )}
                <input
                  type="file"
                  accept=".zip"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}
              {uploading && (
                <div className="mt-4">
                  <p className="text-sm text-foreground">{statusMessage}</p>
                  <progress className="w-full" value={progress} max="100" />
                </div>
              )}
              <Button
                className="mt-6"
                onClick={handleZipUpload}
                disabled={!file || uploading}
              >
                {uploading ? 'Uploading...' : 'Start Analysis'}
              </Button>
            </CardContent>
          </Card>
        )}
        {method === 'git' && (
          <Card className="border border-border bg-card">
            <CardContent>
              <CardTitle>Git Repository URL</CardTitle>
              <CardDescription>
                Enter the URL of a Git repository (GitHub, GitLab, Bitbucket).
              </CardDescription>
              <div className="mt-6">
                <Label htmlFor="git-url" className="text-foreground">
                  Repository URL
                </Label>
                <Input
                  id="git-url"
                  type="text"
                  placeholder="e.g. https://github.com/user/repo.git"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  disabled={uploading}
                />
              </div>
              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}
              {uploading && (
                <div className="mt-4">
                  <p className="text-sm text-foreground">{statusMessage}</p>
                </div>
              )}
              <Button
                className="mt-6"
                onClick={handleGitUpload}
                disabled={!gitUrl || uploading}
              >
                {uploading ? 'Cloning...' : 'Start Analysis'}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
