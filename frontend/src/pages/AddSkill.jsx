// src/pages/AddSkill.jsx
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { addSkill, createSkill, getAllSkills, uploadSkillDemo } from '../services/skill.service';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const AddSkill = () => {
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();
    const navigate = useNavigate();
    const [skillsList, setSkillsList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
    const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(''); // '', 'success', 'error'

    useEffect(() => {
        // Prepare list for autocomplete (optional)
        const fetchSkills = async () => {
            try {
                const data = await getAllSkills();
                setSkillsList(data?.data || []);
            } catch (error) {
                console.error("Failed to load skills", error);
            }
        };
        fetchSkills();
    }, []);

    const selectedType = watch('type');

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            // Find skill ID if selecting existing
            let skillId = null;
            if (!isCreatingNew) {
                const found = skillsList.find(s => s.name.toLowerCase() === data.skillName.toLowerCase());
                if (found) {
                    skillId = found.id;
                } else {
                    toast.error("Skill not found. Please select from list or valid option.");
                    setIsLoading(false);
                    return;
                }
            } else {
                const created = await createSkill({
                    name: data.newSkillName.trim(),
                    category: data.newSkillCategory.trim() || 'General'
                });
                skillId = created.id;
            }

            let videoUrl = uploadedVideoUrl || '';
            if (data.type === 'TEACH' && videoFile) {
                setIsUploading(true);
                setUploadProgress(0);
                setUploadStatus('');
                try {
                    const uploaded = await uploadSkillDemo(videoFile, (progress) => {
                        setUploadProgress(progress);
                    });
                    videoUrl = uploaded.url;
                    setUploadedVideoUrl(videoUrl);
                    setUploadStatus('success');
                } catch (uploadErr) {
                    setUploadStatus('error');
                    toast.error('Video upload failed. Please try again.');
                    setIsLoading(false);
                    setIsUploading(false);
                    return;
                }
                setIsUploading(false);
            }

            await addSkill({
                skillId: skillId,
                type: data.type,
                level: data.level,
                proofUrl: data.proofUrl,
                preview: data.type === 'TEACH' ? {
                    videoUrl,
                    description: data.description,
                    syllabusOutline: data.syllabusOutline
                } : undefined
            });
            
            toast.success('Skill added to your profile!');
            navigate('/skills');
        } catch (error) {
            console.error(error);
            toast.error('Failed to add skill.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
            <h1 className="text-2xl font-bold mb-6">Add Skill to Profile</h1>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                        Select Skill
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={isCreatingNew}
                            onChange={(e) => setIsCreatingNew(e.target.checked)}
                        />
                        Add new skill
                    </label>
                </div>

                {!isCreatingNew ? (
                    <div>
                        <select
                            {...register('skillName', { required: !isCreatingNew ? 'Please select a skill' : false })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="">-- Choose a Skill --</option>
                            {skillsList.map(skill => (
                                <option key={skill.id} value={skill.name}>{skill.name}</option>
                            ))}
                        </select>
                        {errors.skillName && <p className="mt-1 text-sm text-red-400">{errors.skillName.message}</p>}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Input
                                label="New Skill Name"
                                {...register('newSkillName', { required: isCreatingNew ? 'Skill name is required' : false })}
                                placeholder="e.g. UI Design"
                            />
                            {errors.newSkillName && <p className="mt-1 text-sm text-red-400">{errors.newSkillName.message}</p>}
                        </div>
                        <div>
                            <Input
                                label="Category"
                                {...register('newSkillCategory')}
                                placeholder="e.g. Design"
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            {...register('type', { required: true })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="LEARN">I want to Learn</option>
                            <option value="TEACH">I want to Teach</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                        <select
                            {...register('level', { required: true })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="LOW">Beginner</option>
                            <option value="MEDIUM">Intermediate</option>
                            <option value="HIGH">Expert</option>
                        </select>
                    </div>
                </div>

                {selectedType === 'TEACH' && (
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-medium">Teaching Details</h3>
                        <div>
                            <Input label="Description" {...register('description', { required: 'Description is required' })} placeholder="What will you teach?" />
                        </div>
                        <div>
                            <Input label="Syllabus Outline" {...register('syllabusOutline')} placeholder="Brief outline" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Video Preview</label>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setVideoFile(file);
                                    setUploadStatus('');
                                    setUploadedVideoUrl('');
                                    if (file) {
                                        setVideoPreviewUrl(URL.createObjectURL(file));
                                    } else {
                                        setVideoPreviewUrl('');
                                    }
                                }}
                                className="block w-full text-sm text-gray-700"
                            />
                            <p className="text-xs text-gray-500 mt-1">Optional: upload a demo video (max 50MB, MP4/MOV)</p>
                            {isUploading && (
                                <div className="mt-2">
                                    <div className="h-2 rounded bg-gray-200 overflow-hidden">
                                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(100, uploadProgress)}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress}%</p>
                                </div>
                            )}
                            {uploadStatus === 'success' && (
                                <p className="text-xs text-green-400 mt-1 font-medium">Video uploaded successfully!</p>
                            )}
                            {uploadStatus === 'error' && (
                                <p className="text-xs text-red-400 mt-1 font-medium">Upload failed. Please try again.</p>
                            )}
                            {/* Local video preview before upload */}
                            {videoPreviewUrl && !uploadedVideoUrl && !isUploading && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Preview (will upload on submit):</p>
                                    <video src={videoPreviewUrl} controls className="w-full max-h-48 rounded border" />
                                </div>
                            )}
                            {/* Uploaded video preview */}
                            {uploadedVideoUrl && !isUploading && (
                                <div className="mt-2">
                                    <p className="text-xs text-green-400 mb-1 font-medium">Uploaded video:</p>
                                    <video src={uploadedVideoUrl} controls className="w-full max-h-48 rounded border" />
                                </div>
                            )}
                        </div>
                         <div>
                            <Input
                                label="Proof of Skill URL"
                                {...register('proofUrl', {
                                    validate: (value) => {
                                        if (!value) return true; // optional
                                        const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;
                                        return urlPattern.test(value) || 'Enter a valid URL (GitHub, Portfolio, YouTube, etc.)';
                                    }
                                })}
                                placeholder="Portfolio, GitHub, YouTube, etc."
                            />
                            {errors.proofUrl && <p className="mt-1 text-sm text-red-400">{errors.proofUrl.message}</p>}
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <Button type="button" variant="ghost" onClick={() => navigate('/skills')}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Adding...' : 'Add Skill'}</Button>
                </div>
            </form>
        </div>
    );
};

export default AddSkill;
