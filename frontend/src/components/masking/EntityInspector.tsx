import React, { useState } from 'react';
import {
  DetectedEntity,
  EntityCategory,
} from '../../types/index.ts';
import {
  Filter,
  Shield,
} from 'lucide-react';

interface EntityInspectorProps {
  entities: DetectedEntity[];
  transformations: Array<{
    id: string;
    category: EntityCategory;
    maskedSnippet: string;
    strategyApplied: string;
  }>;
  onSelectEntity?: (entity: DetectedEntity) => void;
}

export const EntityInspector: React.FC<EntityInspectorProps> = ({
  entities,
  transformations,
  onSelectEntity,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = Array.from(new Set(entities.map((e) => e.category)));

  const filteredEntities = entities.filter(
    (e) => selectedCategory === 'ALL' || e.category === selectedCategory
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-900">
            Detected Entities &amp; Token Transformations
          </h3>
          <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
            {entities.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Categories ({entities.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, ' ')} ({entities.filter((e) => e.category === cat).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredEntities.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No matching sensitive entities in this category.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/70 text-slate-600 sticky top-0 z-10 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Entity ID</th>
                <th className="py-2.5 px-4">Classification</th>
                <th className="py-2.5 px-4">Detected Value</th>
                <th className="py-2.5 px-4">Masked Output</th>
                <th className="py-2.5 px-4">Confidence</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4 text-right">Offsets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntities.map((entity, idx) => {
                const trans = transformations.find((t) => t.id === entity.id);
                const isCritical = entity.severity === 'critical';
                const isHigh = entity.severity === 'high';

                return (
                  <tr
                    key={entity.id || idx}
                    onClick={() => onSelectEntity?.(entity)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                      #{entity.id}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      <div className="font-semibold text-slate-800">{entity.categoryLabel}</div>
                      <div className="text-[10px] font-mono text-slate-400">{entity.ruleTriggered}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs">
                      <span className="text-slate-400 italic flex items-center gap-1">
                        Protected value
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-emerald-800 bg-emerald-50/30">
                      {trans?.maskedSnippet || `<${entity.category}>`}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {Math.round(entity.confidence * 100)}%
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                          isCritical
                            ? 'text-rose-700'
                            : isHigh
                            ? 'text-amber-700'
                            : 'text-blue-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isCritical
                              ? 'bg-rose-600'
                              : isHigh
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                        />
                        <span className="uppercase">{entity.severity}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      [{entity.startIndex}:{entity.endIndex}]
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
