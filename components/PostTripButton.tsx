
import React from 'react';
import { Plus } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

interface PostTripButtonProps {
    onClick: () => void;
}

const PostTripButton: React.FC<PostTripButtonProps> = ({ onClick }) => {
    const { t } = useLocalization();
    return (
        <button
            onClick={onClick}
            aria-label={t('post_a_trip')}
            className="fixed bottom-6 end-6 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:-translate-y-1 hover:rotate-90 active:scale-95 transition-all duration-300 z-40 group"
        >
            <Plus size={32} className="group-hover:text-white" />
        </button>
    );
};

export default PostTripButton;
