import React from 'react';

export const CATEGORIES = [
    {
        id: 'loader',
        name: 'Loader Spare Parts',
        description: 'High-quality parts for all major loader models',
        icon: 'loader-icon', // We will handle icons in components or use strings/SVGs here if possible, but for now keeping it simple as components use JSX for icons
        gradient: 'from-blue-500 to-cyan-500',
        count: 'HM, L&T, LiuGong, SDLG & More',
        subcategories: [
            { id: 'hm-2021d', name: 'HM 2021D' },
            { id: 'lt-9020', name: 'L&T 9020' },
            { id: 'liugong', name: 'LiuGong' },
            { id: 'sdlg', name: 'SDLG' },
            { id: 'sem', name: 'SEM' },
            { id: 'jcb', name: 'JCB' }
        ]
    },
    {
        id: 'grader',
        name: 'Grader Spare Parts',
        description: 'Durable components for motor graders',
        icon: 'grader-icon',
        gradient: 'from-green-500 to-emerald-500',
        count: '  BEML',
        subcategories: [
            { id: 'cat', name: 'CAT' },
            { id: 'beml', name: 'BEML' }
        ]
    },
    {
        id: 'excavator',
        name: 'Excavator Spare Parts',
        description: 'Genuine and aftermarket parts for all major excavator brands',
        icon: 'excavator-icon',
        gradient: 'from-purple-500 to-pink-500',
        count: 'Komatsu, Hyundai, Tata Hitachi, Volvo & More',
        subcategories: [
            { id: 'hyundai', name: 'Hyundai' },
            { id: 'tata-hitachi', name: 'Tata Hitachi' },
            { id: 'volvo', name: 'Volvo' },
            { id: 'kobelco', name: 'Kobelco' },
            { id: 'lt-komatsu', name: 'L&T Komatsu' }
        ]
    }
];
