import React from 'react';

export const CATEGORIES = [
    {
        id: 'loader',
        name: 'Loader Spare Parts',
        image: '/loader-image.png',
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
        name: 'Motor Grader Spare Parts',
        image: '/motor-grader-image.png',
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
        image: '/excavator-image.png',
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
